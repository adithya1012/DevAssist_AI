import * as vscode from "vscode";
import { DevAssistProvider } from "./webview/DevAssistProvider";
import { ApiConfiguration } from "../shared/api";
import { ApiHandler, createApiHandler } from "../api";
import * as path from "path";
import os from "os";
import { SYSTEM_PROMPT } from "./prompts/system";
import { AssistantMessageContent, parseAssistantMessage, ToolParamName, ToolUseName } from "./assistant-message"
import cloneDeep from "clone-deep"
import { fileExistsAtPath } from "../utils/fs";
import { getReadablePath } from "../utils/path";
import { ClineSayTool } from "../shared/ExtensionMessage";
import { formatResponse } from "./prompts/responses";
import fs from "fs/promises";
import { TerminalManager } from "../integrations/terminal/TerminalManager";



const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

export class DevAssist {
	readonly taskId: string;
	private abort: boolean = false;
	api: ApiHandler;
	terminalManager: TerminalManager = new TerminalManager();
	providerRef: WeakRef<DevAssistProvider>;
	messages: any[] = [];
	lastMessageTs?: number;
	apiConversationHistory: any[] = [];
	assistantMessageContent: any[] = []; 
	didCompleteReadingStream: boolean = false;
	userMessageContent: any[] = [];
	currentStreamingContentIndex = 0; // TODO: update index of the current content being streamed
	constructor(provider: DevAssistProvider, apiConfiguration: ApiConfiguration, task?: string) {
		this.providerRef = new WeakRef(provider);
		this.api = createApiHandler(apiConfiguration);
		this.taskId = Date.now().toString();
		this.startTask(task);
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

	async sayAndCreateMissingParamError(toolName: ToolUseName, paramName: string, relPath?: string) {
		await this.say(
			"error",
			`Cline tried to use ${toolName}${
				relPath ? ` for '${relPath.toPosix()}'` : ""
			} without value for required parameter '${paramName}'. Retrying...`
		)
		return formatResponse.toolError(formatResponse.missingToolParameterError(paramName))
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
					this.assistantMessageContent = parseAssistantMessage(assistantMessage)
					// TODO: present content to user
					console.log(assistantMessage);
					this.presentAssistantMessage()
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

				// console.log(this.assistantMessageContent);
				// TODO: Need to identify in the response any of the tool used or not. 
				const didToolUse = this.assistantMessageContent.some((block) => block.type === "tool_use");
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





	async presentAssistantMessage() {
		console.log("inside function")

		const block = cloneDeep(this.assistantMessageContent[this.currentStreamingContentIndex]) // need to create copy bc while stream is updating the array, it could be updating the reference block properties too
		switch (block.type) {
			case "text": {

				let content = block.content
				if (content) {
					// (have to do this for partial and complete since sending content in thinking tags to markdown renderer will automatically be removed)
					// Remove end substrings of <thinking or </thinking (below xml parsing is only for opening tags)
					// (this is done with the xml parsing below now, but keeping here for reference)
					// content = content.replace(/<\/?t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?$/, "")
					// Remove all instances of <thinking> (with optional line break after) and </thinking> (with optional line break before)
					// - Needs to be separate since we dont want to remove the line break before the first tag
					// - Needs to happen before the xml parsing below
					content = content.replace(/<thinking>\s?/g, "")
					content = content.replace(/\s?<\/thinking>/g, "")

					// Remove partial XML tag at the very end of the content (for tool use and thinking tags)
					// (prevents scrollview from jumping when tags are automatically removed)
					const lastOpenBracketIndex = content.lastIndexOf("<")
					if (lastOpenBracketIndex !== -1) {
						const possibleTag = content.slice(lastOpenBracketIndex)
						// Check if there's a '>' after the last '<' (i.e., if the tag is complete) (complete thinking and tool tags will have been removed by now)
						const hasCloseBracket = possibleTag.includes(">")
						if (!hasCloseBracket) {
							// Extract the potential tag name
							let tagContent: string
							if (possibleTag.startsWith("</")) {
								tagContent = possibleTag.slice(2).trim()
							} else {
								tagContent = possibleTag.slice(1).trim()
							}
							// Check if tagContent is likely an incomplete tag name (letters and underscores only)
							const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent)
							// Preemptively remove < or </ to keep from these artifacts showing up in chat (also handles closing thinking tags)
							const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</"
							// If the tag is incomplete and at the end, remove it from the content
							if (isOpeningOrClosing || isLikelyTagName) {
								content = content.slice(0, lastOpenBracketIndex).trim()
							}
						}
					}
				}
				await this.say("text", content)
				// break
			}
			case "tool_use":
				const toolDescription = () => {
					switch (block.name) {
						case "execute_command":
							return `[${block.name} for '${block.params.command}']`
						case "read_file":
							return `[${block.name} for '${block.params.path}']`
						case "write_to_file":
							return `[${block.name} for '${block.params.path}']`
						case "search_files":
							return `[${block.name} for '${block.params.regex}'${
								block.params.file_pattern ? ` in '${block.params.file_pattern}'` : ""
							}]`
						case "list_files":
							return `[${block.name} for '${block.params.path}']`
						case "list_code_definition_names":
							return `[${block.name} for '${block.params.path}']`
						case "inspect_site":
							return `[${block.name} for '${block.params.url}']`
						case "ask_followup_question":
							return `[${block.name} for '${block.params.question}']`
						case "attempt_completion":
							return `[${block.name}]`
					}
				}
				const pushToolResult = (content: any) => {
					this.userMessageContent.push({
						type: "text",
						text: `${toolDescription()} Result:`,
					})
					if (typeof content === "string") {
						this.userMessageContent.push({
							type: "text",
							text: content || "(tool did not return anything)",
						})
					} else {
						this.userMessageContent.push(...content)
					}
				}
				const removeClosingTag = (tag: ToolParamName, text?: string) => {
					if (!block.partial) {
						return text || ""
					}
					if (!text) {
						return ""
					}
					// This regex dynamically constructs a pattern to match the closing tag:
					// - Optionally matches whitespace before the tag
					// - Matches '<' or '</' optionally followed by any subset of characters from the tag name
					const tagRegex = new RegExp(
						`\\s?<\/?${tag
							.split("")
							.map((char) => `(?:${char})?`)
							.join("")}$`,
						"g"
					)
					return text.replace(tagRegex, "")
				}
				switch (block.name) {
					case "read_file": {
						//TODO: implement read_file
					}
					case "execute_command": {
						const command: string | undefined = block.params.command
						
					
								if (!command) {
									// this.consecutiveMistakeCount++
									pushToolResult(
										await this.sayAndCreateMissingParamError("execute_command", "command")
									)
									break
								}
								// this.consecutiveMistakeCount = 0
								// const didApprove = await askApproval("command", command)
								// if (!didApprove) {
								// 	break
								// }
								const [userRejected, result] = await this.executeCommandTool(command)
								// if (userRejected) {
								// 	this.didRejectTool = true
								// }
								pushToolResult(result)
								// break
							
						 
					}
					case "write_to_file": {
						const relPath: string | undefined = block.params.path
						let newContent: string | undefined = block.params.content
						if (!relPath || !newContent) {
							// checking for newContent ensure relPath is complete
							// wait so we can determine if it's a new file or editing an existing file
							break
						}
						let fileExists: boolean = false;
						const absolutePath = path.resolve(cwd, relPath)
						// fileExists = await fileExistsAtPath(absolutePath)

						if (newContent.startsWith("```")) {
							// this handles cases where it includes language specifiers like ```python ```js
							newContent = newContent.split("\n").slice(1).join("\n").trim()
						}
						if (newContent.endsWith("```")) {
							newContent = newContent.split("\n").slice(0, -1).join("\n").trim()
						}

						// it seems not just llama models are doing this, but also gemini and potentially others
						if (
							newContent.includes("&gt;") ||
							newContent.includes("&lt;") ||
							newContent.includes("&quot;")
						) {
							newContent = newContent
								.replace(/&gt;/g, ">")
								.replace(/&lt;/g, "<")
								.replace(/&quot;/g, '"')
						}
						console.log("newContent", newContent)
					
						fs.writeFile(absolutePath, newContent, "utf8");
							vscode.workspace.openTextDocument(absolutePath).then(doc => {
							vscode.window.showTextDocument(doc);
						});

					}
				}
		}
		if (!block.partial ) {
			
			this.currentStreamingContentIndex++ 

			
		} 
	}

	async executeCommandTool(command: string): Promise<[boolean,string]> {
		const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd)
		terminalInfo.show() // weird visual bug when creating new terminals (even manually) where there's an empty space at the top.
		// const process = this.terminalManager.runCommand(terminalInfo, command)
		terminalInfo.sendText(command);



		let result = ""


		
		// process.once("completed", () => {
		// 	completed = true
		// })

		// process.once("no_shell_integration", async () => {
		// 	await this.say("shell_integration_warning")
		// })

		await process
		let completed = true;
		// Wait for a short delay to ensure all messages are sent to the webview
		// This delay allows time for non-awaited promises to be created and
		// for their associated messages to be sent to the webview, maintaining
		// the correct order of messages (although the webview is smart about
		// grouping command_output messages despite any gaps anyways)
		// await delay(50)

		result = result.trim()



		if (completed) {
			return [false, `Command executed.${result.length > 0 ? `\nOutput:\n${result}` : ""}`]
		} else {
			return [
				false,
				`Command is still running in the user's terminal.${
					result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
				}\n\nYou will be updated on the terminal status and new output in the future.`,
			]
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


}
