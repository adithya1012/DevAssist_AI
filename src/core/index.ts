import * as vscode from "vscode";
import { DevAssistProvider } from "./webview/DevAssistProvider";
import { ApiConfiguration } from "../shared/api";
import { ApiHandler, createApiHandler } from "../api";
import * as path from "path";
import os from "os";
import { SYSTEM_PROMPT } from "./prompts/system";


const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

export class DevAssist {
	readonly taskId: string;
	private abort: boolean = false;
	api: ApiHandler;
	providerRef: WeakRef<DevAssistProvider>;
	messages: any[] = [];
	lastMessageTs?: number;
	apiConversationHistory: any[] = [];
	assistantMessageContent: any[] = []; 
	didCompleteReadingStream: boolean = false;
	userMessageContent: any[] = [];
	constructor(provider: DevAssistProvider, apiConfiguration: ApiConfiguration, task?: string) {
		this.providerRef = new WeakRef(provider);
		this.api = createApiHandler(apiConfiguration);
		this.taskId = Date.now().toString();
		this.startTask(task);
	}

	private async startTask(task?: string): Promise<void> {
		this.messages = [];
		this.apiConversationHistory = [];
		// TODO: At each prominent stage we need to show a message to the user as a update.
		// await this.providerRef.deref()?.postStateToWebview(); // This should be called after each message update and handled in UI.
		
		await this.say("text", task);

		await this.initiateTaskLoop([
			{
				type: "text",
				text: `<task>\n${task}\n</task>`,
			}
		]);
	}

	private async initiateTaskLoop(userContent: any): Promise<void> {
		let nextUserContent = userContent;
		let includeFileDetails = true;
		const didEndLoop = await this.recursivelyMakeClaudeRequests(nextUserContent, includeFileDetails);
		includeFileDetails = false; // we only need file details the first time
	}
	

	async recursivelyMakeClaudeRequests(
		userContent: any,
		includeFileDetails: boolean = false
	): Promise<boolean> {
		if (this.abort) {
			throw new Error("DevAssist instance aborted")
		}

		await this.say(
			"api_req_started",
			JSON.stringify({
				request:userContent
			})
		);

		// TODO: FIXME: Environment is coming Undefined
		// const environmentDetails = await this.loadContext(userContent, includeFileDetails)
		const environmentDetails = "NONE"
		// add environment details as its own text block, separate from tool results
		userContent.push({ type: "text", text: environmentDetails })

		await this.addToApiConversationHistory({ role: "user", content: userContent })

		try {
			
			this.assistantMessageContent = []
			this.didCompleteReadingStream = false
			this.userMessageContent = []

			const stream = this.attemptApiRequest(-1) // TODO -1 is a placeholder for now. For multiple communication we need to replace it by last message index
			let assistantMessage = ""
			try {
				for await (const chunk of stream) {
					assistantMessage += chunk.text
					// TODO: parse raw assistant message into content blocks
					// TODO: present content to user
					console.log(assistantMessage);
				}
			} catch (error) {
				this.abortTask() 
			}

			this.didCompleteReadingStream = true

			
			
			let didEndLoop = false
			if (assistantMessage.length > 0) {
				await this.addToApiConversationHistory({
					role: "assistant",
					content: [{ type: "text", text: assistantMessage }],
				});

				console.log(this.assistantMessageContent);
				// TODO: Need to identify in the response any of the tool used or not. 
				// const didToolUse = this.assistantMessageContent.some((block) => block.type === "tool_use")
				const didToolUse = false;
				if (!didToolUse) {
					this.userMessageContent.push({
						type: "text",
						text: `[ERROR] You did not use a tool in your previous response! Please retry with a tool use.`,
					})
				}

				didEndLoop = true;
			} else {
				await this.say(
					"error",
					"Unexpected API Response: The language model did not provide any assistant messages. This may indicate an issue with the API or the model's output."
				)
				await this.addToApiConversationHistory({
					role: "assistant",
					content: [{ type: "text", text: "Failure: I did not provide a response." }],
				})
			}

			return didEndLoop 
		} catch (error) {
			console.error(error)
			return true
		}
	}


	async *attemptApiRequest(previousApiReqIndex: number): any {
		try {
			let systemPrompt = await SYSTEM_PROMPT(cwd);
			const stream = this.api.createMessage(systemPrompt, this.apiConversationHistory)
			const iterator = stream[Symbol.asyncIterator]()
			const firstChunk = await iterator.next()
			yield firstChunk.value
			yield* iterator
		} catch (error) {
			console.error(error)
			await this.say("api_req_retried")
			// TODO: Based on which error is thrown, we can retry the request
		}
	}

	async loadContext(userContent: any, includeFileDetails: boolean = false) {
		this.getEnvironmentDetails(includeFileDetails);
	}

	async getEnvironmentDetails(includeFileDetails: boolean = false) {
		let details = ""

		// It could be useful for claude to know if the user went from one or no file to another between messages, so we always include this context
		details += "\n\n# VSCode Visible Files"
		const visibleFiles = vscode.window.visibleTextEditors
			?.map((editor) => editor.document?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath)) 
			.join("\n")
		if (visibleFiles) {
			details += `\n${visibleFiles}`
		} else {
			details += "\n(No visible files)"
		}

		details += "\n\n# VSCode Open Tabs"
		const openTabs = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.map((tab) => (tab.input as vscode.TabInputText)?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath))
			.join("\n");
		if (openTabs) {
			details += `\n${openTabs}`
		} else {
			details += "\n(No open tabs)"
		}

		// TODO: Sinduja code integrate for terminal.
		// const busyTerminals = this.terminalManager.getTerminals(true)
		// const inactiveTerminals = this.terminalManager.getTerminals(false)

		return `<environment_details>\n${details.trim()}\n</environment_details>`
	}

	async say(type: string, text?: string) {
		if (this.abort) {
			throw new Error("Aborted");
		}
		const sayTs = Date.now();
		this.lastMessageTs = sayTs;
		await this.addToMessages({ ts: sayTs, type: "say", say: type, text }); // Message will be updated.
		await this.providerRef.deref()?.postStateToWebview();
	}
	private async addToMessages(message: any) {
		this.messages.push(message);
	}

	private async addToApiConversationHistory(message: any) {
		this.apiConversationHistory.push(message);
	}

	abortTask() {
		this.abort = true;
	}
}
