import * as vscode from "vscode";
import pWaitFor from "p-wait-for";
import { DevAssistProvider } from "./webview/DevAssistProvider";
import { ApiConfiguration } from "../shared/api";
import { ApiHandler, createApiHandler } from "../api";
import * as path from "path";
import os from "os";
import { SYSTEM_PROMPT } from "./prompts/system";
import { DEPLOY_PROMPT } from "./prompts/deployment_prompt";
import { AssistantMessageContent, parseAssistantMessage, ToolParamName, ToolUseName } from "./assistant-message";
import cloneDeep from "clone-deep";
import { formatResponse } from "./prompts/responses";
import fs from "fs/promises";
import { TerminalManager } from "../integrations/terminal/TerminalManager";
import { extractTextFromFile } from "../integrations/misc/extract-text";
import { arePathsEqual } from "../utils/path";
import { listFiles } from "./tools/listFiles";
import { DiffViewProvider } from "./editor/DiffViewProvider";
import { fileExistsAtPath } from "../utils/fs";
import delay from "delay";
import {
	checkTerraformInstalled,
	checkGCPInstalled,
	checkGitinstalled,
	isGCloudLoggedIn,
	isGhInstalled,
	isGhLoggedIn,
} from "../utils/requirement";

const cwd =
	vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop");

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
	currentStreamingContentIndex = 0;
	askFollowup: boolean = false; // this is the variable that will be used to determine if ask_followup_question
	askFollowupIndex: number = 0;
	askResponseText: string | undefined = "";
	receivedResponse: boolean = false;
	private diffViewProvider: DiffViewProvider;

	breakLoop: boolean = false;
	terraformInstalled: boolean = false;
	gcpInstalled: boolean = false;
	gitInstalled: boolean = false;
	ghInstalled: boolean = false;
	GCloudLoggedIn: boolean = false;
	ghLoggedIn: boolean = false;
	deployToolCalled: boolean = false;
	repoCreated: boolean = true; // Initially set to true to avoid the first check
	LLmLoopStuckCount: number = 0;
	cmdExecuted: boolean = true;
	// Flags to keep track of the state of the tool use in current task to send events to the webview
	isThinking = false;
	isToolInUse = false;
	isToolUsePermissionRecieved = false;
	toolUsePermission: string | undefined = undefined;

	constructor(provider: DevAssistProvider, apiConfiguration: ApiConfiguration, task?: string) {
		this.providerRef = new WeakRef(provider);
		this.api = createApiHandler(apiConfiguration);
		this.taskId = Date.now().toString();
		this.diffViewProvider = new DiffViewProvider(cwd);
		this.startTask(task);
	}

	async say(type: string, text?: string) {
		if (this.abort) {
			throw new Error("Aborted");
		}
		const sayTs = Date.now();
		this.lastMessageTs = sayTs;
		await this.addToMessages({ ts: sayTs, type: "say", say: type, text }); // Message will be updated.
		// console.log("Calling postStateToWebview");
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
			`Devassist tried to use ${toolName}${
				relPath ? ` for '${relPath.toPosix()}'` : ""
			} without value for required parameter '${paramName}'. Retrying...`
		);
		return formatResponse.toolError(formatResponse.missingToolParameterError(paramName));
	}
	private async startTask(task?: string): Promise<void> {
		this.messages = [];
		this.apiConversationHistory = [];

		await this.say("text", task);

		await this.initiateTaskLoop([
			{
				type: "text",
				text: `<task>\n${task}\n</task>`,
			},
		]);
	}

	private async initiateTaskLoop(userContent: any): Promise<void> {
		let nextUserContent = userContent;
		let includeFileDetails = true;
		const didEndLoop = await this.recursivelyMakeClaudeRequests(nextUserContent, includeFileDetails);
		includeFileDetails = false; // we only need file details the first time
	}

	async recursivelyMakeClaudeRequests(userContent: any, includeFileDetails: boolean = false): Promise<boolean> {
		if (this.abort) {
			throw new Error("DevAssist instance aborted");
		}

		await this.say(
			"api_req_started",
			JSON.stringify({
				request: userContent,
			})
		);
		this.isThinking = true;
		this.providerRef.deref()?.postMessageToWebview({
			type: "showThinking",
		});
		const environmentDetails = await this.loadContext(userContent, includeFileDetails);

		// add environment details as its own text block, separate from tool results
		userContent.push({ type: "text", text: environmentDetails });

		await this.addToApiConversationHistory({ role: "user", content: userContent });

		try {
			this.assistantMessageContent = [];
			this.didCompleteReadingStream = false;
			this.userMessageContent = [];
			this.currentStreamingContentIndex = 0;
			// const response = await this.attemptApiRequest(-1);
			let response = await this.attemptApiRequest();
			let assistantMessage = "";
			let recussiveCall = true;
			let deployToolCalled = false;
			try {
				if (response.content) {
					assistantMessage = response.content;
					this.assistantMessageContent = parseAssistantMessage(assistantMessage);
					// this.assistantMessageContent.forEach(async (block) => {
					// 	if (block.name === "deploy_to_cloud") {
					// 		deployToolCalled = true;
					// 	}
					// });
					for (let i = 0; i < this.assistantMessageContent.length; i++) {
						const block = this.assistantMessageContent[i];
						// if (block.name === "ask_followup_question" || block.name === "attempt_completion") {
						// 	recussiveCall = false;
						// }
						if (block.name === "ask_followup_question" || block.name === "attempt_completion") {
							recussiveCall = false;
						}
						if (block.name === "deploy_to_cloud") {
							deployToolCalled = true;
						}
						await this.presentAssistantMessage(block);
						if (block["name"] === "ask_followup_question" || block["name"] === "attempt_completion") {
							this.breakLoop = true;
						} else {
							this.breakLoop = false;
						}
					}
					if (!this.breakLoop) {
						this.recursivelyMakeClaudeRequests(this.userMessageContent, false);
					}
				}
			} catch (error) {
				console.error(error);
				this.abortTask();
			}

			if (assistantMessage.length > 0) {
				await this.addToApiConversationHistory({
					role: "assistant",
					content: [{ type: "text", text: assistantMessage }],
				});
			}

			this.didCompleteReadingStream = true;

			let didEndLoop = false;
			if (assistantMessage.length > 0) {
				// await this.addToApiConversationHistory({
				// 	role: "assistant",
				// 	content: [{ type: "text", text: assistantMessage }],
				// });

				const didToolUse = this.assistantMessageContent.some((block) => block.type === "tool_use");
				if (!didToolUse) {
					this.LLmLoopStuckCount++;
					this.userMessageContent.push({
						type: "text",
						text: `[ERROR] You did not use a tool in your previous response! Please retry with a tool use.`,
					});
				}
				if ((recussiveCall || deployToolCalled) && this.LLmLoopStuckCount <= 5) {
					try {
						pWaitFor(() => this.repoCreated && this.cmdExecuted, { interval: 100, timeout: 60000 }).then(
							() => {
								this.recursivelyMakeClaudeRequests(this.userMessageContent, false);
							}
						);
					} catch (error) {
						console.error(error);
						this.repoCreated = true;
					}
				} else {
					this.deployToolCalled = false;
					didEndLoop = true;
				}
			} else {
				await this.say(
					"error",
					"Unexpected API Response: The language model did not provide any assistant messages. This may indicate an issue with the API or the model's output."
				);
				await this.addToApiConversationHistory({
					role: "assistant",
					content: [{ type: "text", text: "Failure: I did not provide a response." }],
				});
			}
			await this.say(
				"api_req_finished",
				JSON.stringify({
					response: assistantMessage,
				})
			);
			this.isThinking = false;
			this.providerRef.deref()?.postMessageToWebview({
				type: "hideThinking",
			});

			return didEndLoop;
		} catch (error) {
			console.error(error);
			return true;
		}
	}
	async handleWebviewAskResponse(message: any) {
		const text = message.text;
		// this.askResponseText = text;
		// await this.addToApiConversationHistory({ role: "user", content: this.askResponseText });
		// await this.say("text", this.askResponseText);
		const didEndLoop = this.recursivelyMakeClaudeRequests([{ type: "text", text }], false);
		// this.receivedResponse = true;
	}

	handlePermissionResponse(toolUsePermission: string) {
		this.isToolUsePermissionRecieved = true;
		this.toolUsePermission = toolUsePermission;
	}

	checkIfToolUsePermissionDenied() {
		if (this.toolUsePermission === "DENIED") {
			return true;
		} else {
			return false;
		}
	}

	resetToolUsePermission() {
		this.isToolUsePermissionRecieved = false;
		this.toolUsePermission = undefined;
	}

	async presentAssistantMessage(block: any) {
		// const block = cloneDeep(this.assistantMessageContent[this.currentStreamingContentIndex]);

		if (!block) {
			return;
		}
		switch (block.type) {
			case "text": {
				let content = block.content;
				if (content) {
					content = content.replace(/<thinking>\s?/g, "");
					content = content.replace(/\s?<\/thinking>/g, "");

					const lastOpenBracketIndex = content.lastIndexOf("<");
					if (lastOpenBracketIndex !== -1) {
						const possibleTag = content.slice(lastOpenBracketIndex);
						const hasCloseBracket = possibleTag.includes(">");
						if (!hasCloseBracket) {
							// Extract the potential tag name
							let tagContent: string;
							if (possibleTag.startsWith("</")) {
								tagContent = possibleTag.slice(2).trim();
							} else {
								tagContent = possibleTag.slice(1).trim();
							}
							const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent);
							const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</";
							if (isOpeningOrClosing || isLikelyTagName) {
								content = content.slice(0, lastOpenBracketIndex).trim();
							}
						}
					}
				}
				await this.say("text", content);
				if (this.askFollowup) {
					this.providerRef.deref()?.postMessageToWebview({
						type: "systemMessage",
						thinking: true,
						message: content,
					});
				}

				break;
			}
			case "tool_use": {
				const toolDescription = () => {
					switch (block.name) {
						case "execute_command":
							return `[${block.name} for '${block.params.command}']`;
						case "read_file":
							return `[${block.name} for '${block.params.path}']`;
						case "write_to_file":
							return `[${block.name} for '${block.params.path}']`;
						case "search_files":
							return `[${block.name} for '${block.params.regex}'${
								block.params.file_pattern ? ` in '${block.params.file_pattern}'` : ""
							}]`;
						case "list_files":
							return `[${block.name} for '${block.params.path}']`;
						case "list_code_definition_names":
							return `[${block.name} for '${block.params.path}']`;
						case "inspect_site":
							return `[${block.name} for '${block.params.url}']`;
						case "ask_followup_question":
							return `[${block.name} for '${block.params.question}']`;
						case "attempt_completion":
							return `[${block.name}]`;
						default:
							return ``;
					}
				};
				const pushToolResult = (content: any) => {
					if (typeof content === "string") {
						this.userMessageContent.push({
							type: "text",
							text: `${toolDescription()} Result: ${content}`,
						});
					} else {
						this.userMessageContent.push(...content);
					}
				};
				const removeClosingTag = (tag: ToolParamName, text?: string) => {
					if (!block.partial) {
						return text || "";
					}
					if (!text) {
						return "";
					}
					const tagRegex = new RegExp(
						`\\s?<\/?${tag
							.split("")
							.map((char) => `(?:${char})?`)
							.join("")}$`,
						"g"
					);
					return text.replace(tagRegex, "");
				};
				switch (block.name) {
					case "deploy_to_cloud": {
						this.deployToolCalled = true;
						this.repoCreated = false;
						// check for dependicies are installed or not
						// await checkTerraformInstalled().then((isInstalled) => {
						// 	if (isInstalled) {
						// 		this.terraformInstalled = true;
						// 	} else {
						// 		console.log("Terraform is not installed. Please install it to proceed.");
						// 	}
						// });
						await checkGCPInstalled().then(async (isInstalled) => {
							if (isInstalled) {
								this.gcpInstalled = true;
								await isGCloudLoggedIn().then((isLoggedIn) => {
									if (isLoggedIn) {
										this.GCloudLoggedIn = true;
									} else {
										this.informUser(
											"We are running gcloud auth list and we see that, you are not logged into any Google Cloud hosts. \n\n To log in, run: gcloud auth login. https://cloud.google.com/sdk/gcloud/reference/auth/login"
										);
									}
								});
							} else {
								this.informUser(
									"We are running 'gcloud --version' and we see that Google Cloud SDK (gcloud) is not installed. Please install it to proceed. \n\n To install, visit https://cloud.google.com/sdk/docs/install \n\n Once you install please login by 'gcloud auth login' command."
								);
							}
						});
						await checkGitinstalled().then((isInstalled) => {
							if (isInstalled) {
								this.gitInstalled = true;
							} else {
								this.informUser(
									"We are running 'git --version' and we see that Git is not installed. Please install it to proceed. \n\n To install, visit https://git-scm.com/downloads"
								);
							}
						});
						await isGhInstalled().then(async (isInstalled) => {
							if (isInstalled) {
								this.ghInstalled = true;
								await isGhLoggedIn().then((isLoggedIn) => {
									if (isLoggedIn) {
										this.ghLoggedIn = true;
									} else {
										this.informUser(
											"We are running 'gh auth status' and we see that, you are not logged into any GitHub hosts (gh). \n\n To log in, run: 'gh auth login'."
										);
									}
								});
							} else {
								this.informUser(
									"We are running 'gh --version' and we see that GitHub CLI (gh) is not installed. Please install it to proceed. \n\n To install, visit https://cli.github.com/ .\n\n Once you install please login by 'gh auth login' command."
								);
							}
						});

						if (
							// this.terraformInstalled &&
							this.gcpInstalled &&
							this.gitInstalled &&
							this.ghInstalled &&
							this.GCloudLoggedIn &&
							this.ghLoggedIn
						) {
							// All dependies are installed and user is logged in to gcloud

							const relPath: string | undefined = block.params.path;
							// Validate the file path
							if (!relPath) {
								pushToolResult(await this.sayAndCreateMissingParamError("read_file", "path"));
								break;
							}
							const absolutePath = path.resolve(cwd, relPath);

							const [success, result] = await this.setupAndPushRepo(absolutePath, block.params.name);
							if (success) {
								this.informUser("Repository created successfully. Repository URL: " + result);
							} else {
								this.informUser(
									`${result} \n\n Error creating repository with the name block.params.name. Please try again with a new chat.`
								);
							}
						} else {
							this.informUser(
								"Please install above dependencies and create a new chat with the same prompt to proceed \n\n"
							);
							this.userMessageContent.push({
								type: "text",
								text: `User did not install the dependencies. He infomred to install the requrement to host the application in cloud. Once you get the any response from user, you SHOULD call deploy_to_cloud tool again to check for dependencies.`,
							});
							this.deployToolCalled = false;
							this.repoCreated = true; // Set to true to avoid the first check
						}
						break;
					}
					case "read_file": {
						// Add the permission logic
						this.providerRef.deref()?.postMessageToWebview({
							type: "requestPermission",
							message: "DevAssist needs permission to read the file. Do you want to proceed?",
							permissionType: "read_file",
							params: block.params,
						});

						await pWaitFor(() => this.isToolUsePermissionRecieved, { interval: 100 });
						if (this.checkIfToolUsePermissionDenied()) {
							this.userMessageContent.push({
								type: "text",
								text: `Permission denied for tool use: ${block.name}`,
							});
							this.resetToolUsePermission();
							break;
						}
						this.resetToolUsePermission();

						const relPath: string | undefined = block.params.path;

						// Validate the file path
						if (!relPath) {
							pushToolResult(await this.sayAndCreateMissingParamError("read_file", "path"));
							break;
						}

						const absolutePath = path.resolve(cwd, relPath);

						try {
							// Use extractTextFromFile to read the file content
							// const fileContent = await extractTextFromFile(absolutePath);
							const fileContent = await fs.readFile(absolutePath, "utf8");

							// Optional: Clean up special characters if needed
							const cleanedContent = fileContent
								.replace(/&gt;/g, ">")
								.replace(/&lt;/g, "<")
								.replace(/&quot;/g, '"');

							// Add result to messages or webview state
							this.userMessageContent.push({
								type: "text",
								text: `Read file: ${relPath}`,
							});
							this.userMessageContent.push({
								type: "text",
								text: cleanedContent,
							});

							// Optionally show file content in webview
							// this.providerRef.deref()?.postMessageToWebview({
							// 	type: "systemMessage",
							// 	message: `File content from ${relPath}:\n${cleanedContent}`,
							// });

							// Push result for further processing
							pushToolResult(cleanedContent);
						} catch (err: any) {
							// Handle file read errors
							console.error(err);
							const errorMessage = `Error reading file '${relPath}': ${err.message}`;
							pushToolResult(errorMessage);

							// this.userMessageContent.push({
							// 	type: "text",
							// 	text: errorMessage,
							// });
						}

						break;
					}
					case "execute_command": {
						this.cmdExecuted = false;
						const command: string = block.params.command;
						if (!command) {
							pushToolResult(await this.sayAndCreateMissingParamError("execute_command", "command"));
							break;
						}
						const [userRejected, result] = await this.executeCommandTool(command);
						pushToolResult(result);
						// Add result to messages
						console.log(result);
						this.userMessageContent.push({
							type: "text",
							text: `Executed command: ${command}, Result: ${result}`,
						});

						break;
					}
					case "write_to_file": {
						const relPath: string | undefined = block.params.path;
						let newContent: string | undefined = block.params.content;
						if (!relPath || !newContent) {
							break;
						}

						if (newContent.startsWith("```")) {
							newContent = newContent.split("\n").slice(1).join("\n").trim();
						}
						if (newContent.endsWith("```")) {
							newContent = newContent.split("\n").slice(0, -1).join("\n").trim();
						}

						if (
							newContent.includes("&gt;") ||
							newContent.includes("&lt;") ||
							newContent.includes("&quot;")
						) {
							newContent = newContent
								.replace(/&gt;/g, ">")
								.replace(/&lt;/g, "<")
								.replace(/&quot;/g, '"');
						}

						console.log(block);
						console.log(relPath, newContent);
						this.providerRef.deref()?.postMessageToWebview({
							type: "requestPermission",
							message: "DevAssist needs permission to write to file. Do you want to proceed?",
							permissionType: "write_to_file",
							params: block.params,
						});

						let fileExists: boolean;
						const absolutePath = path.resolve(cwd, relPath);
						fileExists = await fileExistsAtPath(absolutePath);
						this.diffViewProvider.editType = fileExists ? "modify" : "create";

						await this.diffViewProvider.open(relPath);
						await this.diffViewProvider.update(newContent, true);
						await delay(300); // wait for diff view to update
						this.diffViewProvider.scrollToFirstDiff();

						await pWaitFor(() => this.isToolUsePermissionRecieved, { interval: 100 });
						if (this.checkIfToolUsePermissionDenied()) {
							this.userMessageContent.push({
								type: "text",
								text: `Permission denied for tool use: ${block.name}`,
							});
							this.resetToolUsePermission();
							await this.diffViewProvider.revertChanges();
							await this.diffViewProvider.reset();
							break;
						}
						this.resetToolUsePermission();
						await this.diffViewProvider.saveChanges();

						// const absolutePath = path.resolve(cwd, relPath);

						// const dirPath = path.dirname(absolutePath);

						// await fs.mkdir(dirPath, { recursive: true });

						// fs.writeFile(absolutePath, newContent, "utf8");
						// vscode.workspace.openTextDocument(absolutePath).then((doc) => {
						// 	vscode.window.showTextDocument(doc);
						// });
						this.userMessageContent.push({
							type: "text",
							text: `Wrote to file: ${relPath}`,
						});
						// this.recursivelyMakeClaudeRequests(this.userMessageContent, false); // TODO: This code need to be replaced with the user permission from Nidhi's UI code integration.
						await this.diffViewProvider.reset();
						break;
					}
					case "search_files": {
						const regexString: string | undefined = block.params.regex;
						const filePattern: string | undefined = block.params.file_pattern;
						const caseInsensitive = block.params.case_insensitive || false;
						const fileExtensionFilter = block.params.file_extension || "*";
						const maxResults = block.params.max_results || 100;

						// Validate regex parameter
						if (!regexString) {
							pushToolResult(await this.sayAndCreateMissingParamError("search_files", "regex"));
							break;
						}

						const searchRegex = new RegExp(regexString, caseInsensitive ? "gi" : "g");
						const searchDirectory = filePattern ? path.resolve(cwd, filePattern) : cwd;

						try {
							// Collect matching files
							const matchedFiles: string[] = [];
							const matches: { file: string; lines: string[] }[] = [];

							// Recursive function to scan files
							const searchFilesRecursive = async (dir: string) => {
								const entries = await fs.readdir(dir, { withFileTypes: true });
								for (const entry of entries) {
									const fullPath = path.join(dir, entry.name);

									if (entry.isDirectory()) {
										// Recursively search subdirectories
										await searchFilesRecursive(fullPath);
									} else {
										// Only process files matching the extension filter
										if (fileExtensionFilter !== "*" && !entry.name.endsWith(fileExtensionFilter)) {
											continue;
										}
										matchedFiles.push(fullPath);
									}
								}
							};

							// Start searching files
							await searchFilesRecursive(searchDirectory);

							let resultCount = 0;
							for (const file of matchedFiles) {
								if (resultCount >= maxResults) {
									break;
								}

								try {
									const fileContent = await fs.readFile(file, "utf8");
									const lines = fileContent.split("\n");
									const matchingLines = lines.filter((line) => searchRegex.test(line));

									if (matchingLines.length > 0) {
										const relativePath = path.relative(cwd, file);
										matches.push({
											file: relativePath,
											lines: matchingLines.map((line) =>
												line.replace(searchRegex, (match) => `**${match}**`)
											),
										});
										resultCount += matchingLines.length;
									}
								} catch (err: any) {
									this.userMessageContent.push({
										type: "text",
										text: `Error reading file '${file}': ${err.message}`,
									});
								}
							}

							// Prepare results for display
							if (matches.length === 0) {
								this.userMessageContent.push({
									type: "text",
									text: `No matches found for regex '${regexString}'.`,
								});
							} else {
								for (const match of matches) {
									this.userMessageContent.push({
										type: "text",
										text: `Matches in file: ${match.file}`,
									});
									this.userMessageContent.push({
										type: "text",
										text: match.lines.join("\n"),
									});
								}
							}

							this.providerRef.deref()?.postMessageToWebview({
								type: "systemMessage",
								message: matches.length
									? `Found ${matches.length} matches for '${regexString}'.`
									: `No matches found for '${regexString}'.`,
							});
						} catch (err: any) {
							const errorMessage = `Error searching files in '${searchDirectory}': ${err.message}`;
							pushToolResult(errorMessage);

							// this.userMessageContent.push({
							// 	type: "text",
							// 	text: errorMessage,
							// });
						}

						break;
					}
					case "list_files": {
						const relPath: string | undefined = block.params.path;
						const recursive = block.params.recursive === "true"; // Treat as boolean

						if (!relPath) {
							pushToolResult(await this.sayAndCreateMissingParamError("list_files", "path"));
							break;
						}

						const absolutePath = path.resolve(cwd, relPath);
						try {
							// Check if the directory exists
							await fs.access(absolutePath);

							// List files (recursively if needed)
							const listFilesRecursively = async (directory: string): Promise<string[]> => {
								const entries = await fs.readdir(directory, { withFileTypes: true });
								const files = entries
									.filter((entry) => entry.isFile())
									.map((entry) => path.join(directory, entry.name));
								if (recursive) {
									const folders = entries.filter((entry) => entry.isDirectory());
									for (const folder of folders) {
										const folderPath = path.join(directory, folder.name);
										files.push(...(await listFilesRecursively(folderPath)));
									}
								}
								return files;
							};

							const files = await listFilesRecursively(absolutePath);

							// Notify the user
							if (files.length === 0) {
								this.userMessageContent.push({
									type: "text",
									text: `The directory '${relPath}' is empty.`,
								});
							} else {
								this.userMessageContent.push({
									type: "text",
									text: `Files in directory: ${relPath}`,
								});
								this.userMessageContent.push({
									type: "text",
									text: files.join("\n"),
								});
							}

							// Optionally show file list in webview
							// this.providerRef.deref()?.postMessageToWebview({
							// 	type: "systemMessage",
							// 	message:
							// 		files.length > 0
							// 			? `Files in directory ${relPath}:\n${files.join("\n")}`
							// 			: `The directory '${relPath}' is empty.`,
							// });
						} catch (err: any) {
							// Handle errors
							const errorMessage = `Error listing files in directory '${relPath}': ${err.message}`;
							pushToolResult(errorMessage);
							this.userMessageContent.push({
								type: "text",
								text: errorMessage,
							});
						}

						break;
					}
					case "attempt_completion": {
						this.providerRef.deref()?.postMessageToWebview({
							type: "systemMessage",
							message: block.params.result,
						});
						break;
					}
					case "ask_followup_question": {
						const followupQuestion = block.params.question;
						this.informUser(followupQuestion);
						break;
					}
				}

				// if (block.name !== "ask_followup_question" && block.name !== "attempt_completion") {
				// 	this.recursivelyMakeClaudeRequests(this.userMessageContent, false);
				// }
			}
		}
	}

	async informUser(message: string) {
		this.providerRef.deref()?.postMessageToWebview({
			type: "hideThinking",
		});
		this.providerRef.deref()?.postMessageToWebview({
			type: "systemMessage",
			message: message,
		});
	}

	async executeCommandTool(command: string): Promise<[boolean, string]> {
		const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd);
		terminalInfo.show();
		terminalInfo.sendText(command);

		return new Promise<[boolean, string]>((resolve, reject) => {
			const outputChannel = vscode.window.createOutputChannel("Command Output");

			// Use child_process for more reliable output capturing
			const { exec } = require("child_process");

			exec(command, { cwd }, (error: Error | null, stdout: string, stderr: string) => {
				// Combine stdout and stderr
				let fullOutput = "";
				if (stdout) {
					fullOutput += `Standard Output:\n${stdout}\n`;
					outputChannel.appendLine(`Standard Output:\n${stdout}`);
				}

				if (stderr) {
					fullOutput += `Error Output:\n${stderr}\n`;
					outputChannel.appendLine(`Error Output:\n${stderr}`);
				}

				if (error) {
					fullOutput += `Execution Error: ${error.message}\n`;
					outputChannel.appendLine(`Execution Error: ${error.message}`);

					resolve([false, fullOutput]);
				} else {
					resolve([true, fullOutput]);
				}
			});
		});
	}

	async executeCommandTool_for_deploy(command: string): Promise<[boolean, string]> {
		const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd);
		terminalInfo.show();
		terminalInfo.sendText(command);

		return new Promise<[boolean, string]>((resolve, reject) => {
			const outputChannel = vscode.window.createOutputChannel("Command Output");

			// Use child_process for more reliable output capturing
			const { exec } = require("child_process");

			exec(command, { cwd }, (error: Error | null, stdout: string, stderr: string) => {
				// Combine stdout and stderr
				let fullOutput = "";
				if (stdout) {
					fullOutput += `${stdout}`.trim();
					resolve([false, fullOutput]);
				}
				if (stderr) {
					fullOutput += `${stderr}`.trim();
					resolve([true, fullOutput]);
				}
				if (error) {
					fullOutput += `${error.message}`.trim();
					resolve([true, fullOutput]);
				}
			});
		});
	}

	async setupAndPushRepo(path: string, repoName: string): Promise<[boolean, string]> {
		try {
			let result = "";

			// Step 1: Get the GitHub username
			const [usernameRejected, usernameResult] = await this.executeCommandTool_for_deploy(
				"gh api user -q '.login'"
			);
			if (usernameRejected) {
				result = `Failed to get GitHub username. Please run the command gh api user -q '.login'`;
				return [true, result];
			}
			const gitUsername = usernameResult.trim();

			const createRepoCommand = `cd ${path} && git init && git add . && git commit -m "Initial commit" && gh repo create ${gitUsername}/${repoName} --public --source=. && git branch -M main && git push -u origin main`;
			const [createRepoRejected, createRepoResult] = await this.executeCommandTool_for_deploy(createRepoCommand);
			if (createRepoRejected) {
				result = `Failed to create repository.`;
				return [false, result];
			}
			console.log(`Repository "${repoName}" created and code pushed to the 'main' branch successfully.`);
			result = `https://github.com/${gitUsername}/${repoName}`;
			this.userMessageContent.push({
				type: "text",
				text: `Repository URL : ${result}`,
			});
			return [true, result];
		} catch (error) {
			this.userMessageContent.push({
				type: "text",
				text: `Could not created repository. Error: ${error.message}, use attempt_completion to inform user about this.`,
			});
			return [false, ""];
		} finally {
			this.repoCreated = true;
			const commands = `cd ${cwd}`;
			const [commandRejected, commandResult] = await this.executeCommandTool_for_deploy(commands);
		}
	}

	async attemptApiRequest(): Promise<any> {
		try {
			let systemPrompt: string;
			if (this.deployToolCalled) {
				let deployPrompt = await DEPLOY_PROMPT(cwd);
				systemPrompt = await SYSTEM_PROMPT(cwd);
				systemPrompt = systemPrompt + deployPrompt;
			} else {
				systemPrompt = await SYSTEM_PROMPT(cwd);
			}
			const response = await this.api.createMessage(systemPrompt, this.apiConversationHistory);
			return response;
		} catch (error) {
			console.error(error);
			await this.say("api_req_retried");
		}
	}

	async loadContext(userContent: any, includeFileDetails: boolean = false) {
		return this.getEnvironmentDetails(includeFileDetails);
	}

	async getEnvironmentDetails(includeFileDetails: boolean = false) {
		let details = "";

		// It could be useful for claude to know if the user went from one or no file to another between messages, so we always include this context
		details += "\n\n# VSCode Visible Files";
		const visibleFiles = vscode.window.visibleTextEditors
			?.map((editor) => editor.document?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath))
			.join("\n");
		if (visibleFiles) {
			details += `\n${visibleFiles}`;
		} else {
			details += "\n(No visible files)";
		}

		details += "\n\n# VSCode Open Tabs";
		const openTabs = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.map((tab) => (tab.input as vscode.TabInputText)?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath))
			.join("\n");
		if (openTabs) {
			details += `\n${openTabs}`;
		} else {
			details += "\n(No open tabs)";
		}

		if (includeFileDetails) {
			details += `\n\n# Current Working Directory (${cwd}) Files\n`;
			const isDesktop = arePathsEqual(cwd, path.join(os.homedir(), "Desktop"));
			if (isDesktop) {
				// don't want to immediately access desktop since it would show permission popup
				details += "(Desktop files not shown automatically. Use list_files to explore if needed.)";
			} else {
				const [files, didHitLimit] = await listFiles(cwd, true, 200);
				const result = (cwd: string, files: string[], didHitLimit: boolean): string => {
					const sorted = files
						.map((file) => {
							// convert absolute path to relative path
							const relativePath = path.relative(cwd, file);
							return file.endsWith("/") ? relativePath + "/" : relativePath;
						})
						// Sort so files are listed under their respective directories to make it clear what files are children of what directories. Since we build file list top down, even if file list is truncated it will show directories that devassist can then explore further.
						.sort((a, b) => {
							const aParts = a.split("/"); // only works if we use toPosix first
							const bParts = b.split("/");
							for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
								if (aParts[i] !== bParts[i]) {
									// If one is a directory and the other isn't at this level, sort the directory first
									if (i + 1 === aParts.length && i + 1 < bParts.length) {
										return -1;
									}
									if (i + 1 === bParts.length && i + 1 < aParts.length) {
										return 1;
									}
									// Otherwise, sort alphabetically
									return aParts[i].localeCompare(bParts[i], undefined, {
										numeric: true,
										sensitivity: "base",
									});
								}
							}
							// If all parts are the same up to the length of the shorter path,
							// the shorter one comes first
							return aParts.length - bParts.length;
						});
					if (didHitLimit) {
						return `${sorted.join(
							"\n"
						)}\n\n(File list truncated. Use list_files on specific subdirectories if you need to explore further.)`;
					} else if (sorted.length === 0 || (sorted.length === 1 && sorted[0] === "")) {
						return "No files found.";
					} else {
						return sorted.join("\n");
					}
				};
				details += result;
			}
		}
		console.log("details", details);
		return `<environment_details>\n${details.trim()}\n</environment_details>`;
	}
}
