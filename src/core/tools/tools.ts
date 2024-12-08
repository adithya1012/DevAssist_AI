// async presentAssistantMessage() {
//     const block = cloneDeep(this.assistantMessageContent[this.currentStreamingContentIndex]); // need to create copy bc while stream is updating the array, it could be updating the reference block properties too
//     // console.log("block", block);
//     if (!block) {
//         return;
//     }
//     switch (block.type) {
//         case "text": {
//             let content = block.content;
//             if (content) {
//                 const openTagRegex = /<thinking>\s?/g;
//                 const closeTagRegex = /\s?<\/thinking>/g;
//                 content = content.replace(/<thinking>\s?/g, "");
//                 content = content.replace(/\s?<\/thinking>/g, "");

//                 // if (!this.isThinking && openTagRegex.test(block.content)) {
//                 // 	this.isThinking = true;
//                 // 	this.providerRef.deref()?.postMessageToWebview({
//                 // 		type: "showThinking",
//                 // 	});
//                 // }

//                 // if (this.isThinking && closeTagRegex.test(block.content)) {
//                 // 	this.isThinking = false;
//                 // 	this.providerRef.deref()?.postMessageToWebview({
//                 // 		type: "hideThinking",
//                 // 	});
//                 // }

//                 const lastOpenBracketIndex = content.lastIndexOf("<");
//                 if (lastOpenBracketIndex !== -1) {
//                     const possibleTag = content.slice(lastOpenBracketIndex);
//                     const hasCloseBracket = possibleTag.includes(">");
//                     if (!hasCloseBracket) {
//                         // Extract the potential tag name
//                         let tagContent: string;
//                         if (possibleTag.startsWith("</")) {
//                             tagContent = possibleTag.slice(2).trim();
//                         } else {
//                             tagContent = possibleTag.slice(1).trim();
//                         }
//                         const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent);
//                         const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</";
//                         if (isOpeningOrClosing || isLikelyTagName) {
//                             content = content.slice(0, lastOpenBracketIndex).trim();
//                         }
//                     }
//                 }
//             }
//             await this.say("text", content);
//             // console.log("content ####", content);
//             if (this.askFollowup) {
//                 this.providerRef.deref()?.postMessageToWebview({
//                     type: "systemMessage",
//                     thinking: true,
//                     message: content,
//                 });
//             }

//             break;
//         }
//         case "tool_use":
//             const toolDescription = () => {
//                 switch (block.name) {
//                     case "execute_command":
//                         return `[${block.name} for '${block.params.command}']`;
//                     case "read_file":
//                         return `[${block.name} for '${block.params.path}']`;
//                     case "write_to_file":
//                         return `[${block.name} for '${block.params.path}']`;
//                     case "search_files":
//                         return `[${block.name} for '${block.params.regex}'${
//                             block.params.file_pattern ? ` in '${block.params.file_pattern}'` : ""
//                         }]`;
//                     case "list_files":
//                         return `[${block.name} for '${block.params.path}']`;
//                     case "list_code_definition_names":
//                         return `[${block.name} for '${block.params.path}']`;
//                     case "inspect_site":
//                         return `[${block.name} for '${block.params.url}']`;
//                     case "ask_followup_question":
//                         return `[${block.name} for '${block.params.question}']`;
//                     case "attempt_completion":
//                         return `[${block.name}]`;
//                     default:
//                         return ``;
//                 }
//             };
//             const pushToolResult = (content: any) => {
//                 this.userMessageContent.push({
//                     type: "text",
//                     text: `${toolDescription()} Result:`,
//                 });
//                 if (typeof content === "string") {
//                     this.userMessageContent.push({
//                         type: "text",
//                         text: content || "(tool did not return anything)",
//                     });
//                 } else {
//                     this.userMessageContent.push(...content);
//                 }
//             };
//             const removeClosingTag = (tag: ToolParamName, text?: string) => {
//                 if (!block.partial) {
//                     return text || "";
//                 }
//                 if (!text) {
//                     return "";
//                 }
//                 const tagRegex = new RegExp(
//                     `\\s?<\/?${tag
//                         .split("")
//                         .map((char) => `(?:${char})?`)
//                         .join("")}$`,
//                     "g"
//                 );
//                 return text.replace(tagRegex, "");
//             };
//             // if (!this.isToolInUse && block.name !== "attempt_completion") {
//             // 	this.isToolInUse = true;
//             // 	this.providerRef.deref()?.postMessageToWebview({
//             // 		type: "showToolInUse",
//             // 		toolName: block.name,
//             // 	});
//             // }
//             switch (block.name) {
//                 case "read_file": {
//                     const relPath: string | undefined = block.params.path;
                
//                     // Validate the file path
//                     if (!relPath) {
//                         pushToolResult(await this.sayAndCreateMissingParamError("read_file", "path"));
//                         break;
//                     }
                
//                     const absolutePath = path.resolve(cwd, relPath);
//                     try {
//                         // Check if the file exists
//                         await fs.access(absolutePath);
                
//                         // Read file content
//                         const fileContent = await fs.readFile(absolutePath, "utf8");
                
//                         // Optional: Clean up special characters if needed
//                         const cleanedContent = fileContent
//                             .replace(/&gt;/g, ">")
//                             .replace(/&lt;/g, "<")
//                             .replace(/&quot;/g, '"');
                
//                         // Add result to messages or webview state
//                         this.userMessageContent.push({
//                             type: "text",
//                             text: `Read file: ${relPath}`,
//                         });
//                         this.userMessageContent.push({
//                             type: "text",
//                             text: cleanedContent,
//                         });
                
//                         // Optionally show file content in webview
//                         this.providerRef.deref()?.postMessageToWebview({
//                             type: "systemMessage",
//                             message: `File content from ${relPath}:\n${cleanedContent}`,
//                         });
                
//                     } catch (err: any) {
//                         // Handle file read errors
//                         const errorMessage = `Error reading file '${relPath}': ${err.message}`;
//                         pushToolResult(errorMessage);
                
//                         this.userMessageContent.push({
//                             type: "text",
//                             text: errorMessage,
//                         });
//                     }
                
//                     break;
//                 }
                
//                 case "execute_command": {
//                     const command: string = block.params.command;
//                     if (!command) {
//                         pushToolResult(await this.sayAndCreateMissingParamError("execute_command", "command"));
//                         break;
//                     }
//                     const [userRejected, result] = await this.executeCommandTool(command);
//                     pushToolResult(result);
//                     break;
//                 }
//                 case "write_to_file": {
//                     const relPath: string | undefined = block.params.path;
//                     let newContent: string | undefined = block.params.content;
//                     if (!relPath || !newContent) {
//                         break;
//                     }
//                     let fileExists: boolean = false;
//                     const absolutePath = path.resolve(cwd, relPath);

//                     if (newContent.startsWith("```")) {
//                         newContent = newContent.split("\n").slice(1).join("\n").trim();
//                     }
//                     if (newContent.endsWith("```")) {
//                         newContent = newContent.split("\n").slice(0, -1).join("\n").trim();
//                     }

//                     if (
//                         newContent.includes("&gt;") ||
//                         newContent.includes("&lt;") ||
//                         newContent.includes("&quot;")
//                     ) {
//                         newContent = newContent
//                             .replace(/&gt;/g, ">")
//                             .replace(/&lt;/g, "<")
//                             .replace(/&quot;/g, '"');
//                     }

//                     fs.writeFile(absolutePath, newContent, "utf8");
//                     vscode.workspace.openTextDocument(absolutePath).then((doc) => {
//                         vscode.window.showTextDocument(doc);
//                     });
//                     break;
//                 }
//                 case "search_files": {
//                     const regexString: string | undefined = block.params.regex;
//                     const filePattern: string | undefined = block.params.file_pattern;
//                     const caseInsensitive = block.params.case_insensitive || false;
//                     const fileExtensionFilter = block.params.file_extension || "*";
//                     const maxResults = block.params.max_results || 100;
                
//                     // Validate regex parameter
//                     if (!regexString) {
//                         pushToolResult(await this.sayAndCreateMissingParamError("search_files", "regex"));
//                         break;
//                     }
                
//                     const searchRegex = new RegExp(regexString, caseInsensitive ? "gi" : "g");
//                     const searchDirectory = filePattern ? path.resolve(cwd, filePattern) : cwd;
                
//                     try {
//                         // Collect matching files
//                         const matchedFiles: string[] = [];
//                         const matches: { file: string; lines: string[] }[] = [];
                
//                         // Recursive function to scan files
//                         const searchFilesRecursive = async (dir: string) => {
//                             const entries = await fs.readdir(dir, { withFileTypes: true });
//                             for (const entry of entries) {
//                                 const fullPath = path.join(dir, entry.name);
                
//                                 if (entry.isDirectory()) {
//                                     // Recursively search subdirectories
//                                     await searchFilesRecursive(fullPath);
//                                 } else {
//                                     // Only process files matching the extension filter
//                                     if (fileExtensionFilter !== "*" && !entry.name.endsWith(fileExtensionFilter)) {
//                                         continue;
//                                     }
//                                     matchedFiles.push(fullPath);
//                                 }
//                             }
//                         };
                
//                         // Start searching files
//                         await searchFilesRecursive(searchDirectory);
                
//                         let resultCount = 0;
//                         for (const file of matchedFiles) {
//                             if (resultCount >= maxResults) {
//                                 break;
//                             }
                
//                             try {
//                                 const fileContent = await fs.readFile(file, "utf8");
//                                 const lines = fileContent.split("\n");
//                                 const matchingLines = lines.filter((line) => searchRegex.test(line));
                
//                                 if (matchingLines.length > 0) {
//                                     const relativePath = path.relative(cwd, file);
//                                     matches.push({
//                                         file: relativePath,
//                                         lines: matchingLines.map((line) =>
//                                             line.replace(searchRegex, (match) => `**${match}**`)
//                                         ),
//                                     });
//                                     resultCount += matchingLines.length;
//                                 }
//                             } catch (err: any) {
//                                 this.userMessageContent.push({
//                                     type: "text",
//                                     text: `Error reading file '${file}': ${err.message}`,
//                                 });
//                             }
//                         }
                
//                         // Prepare results for display
//                         if (matches.length === 0) {
//                             this.userMessageContent.push({
//                                 type: "text",
//                                 text: `No matches found for regex '${regexString}'.`,
//                             });
//                         } else {
//                             for (const match of matches) {
//                                 this.userMessageContent.push({
//                                     type: "text",
//                                     text: `Matches in file: ${match.file}`,
//                                 });
//                                 this.userMessageContent.push({
//                                     type: "text",
//                                     text: match.lines.join("\n"),
//                                 });
//                             }
//                         }
                
//                         this.providerRef.deref()?.postMessageToWebview({
//                             type: "systemMessage",
//                             message: matches.length
//                                 ? `Found ${matches.length} matches for '${regexString}'.`
//                                 : `No matches found for '${regexString}'.`,
//                         });
//                     } catch (err: any) {
//                         const errorMessage = `Error searching files in '${searchDirectory}': ${err.message}`;
//                         pushToolResult(errorMessage);
                
//                         this.userMessageContent.push({
//                             type: "text",
//                             text: errorMessage,
//                         });
//                     }
                
//                     break;
//                 }

//                 case "list_files": {
//                     const relPath: string | undefined = block.params.path;
//                     const recursive = block.params.recursive === "true"; // Treat as boolean
                
//                     if (!relPath) {
//                         pushToolResult(await this.sayAndCreateMissingParamError("list_files", "path"));
//                         break;
//                     }
                
//                     const absolutePath = path.resolve(cwd, relPath);
//                     try {
//                         // Check if the directory exists
//                         await fs.access(absolutePath);
                
//                         // List files (recursively if needed)
//                         const listFilesRecursively = async (directory: string): Promise<string[]> => {
//                             const entries = await fs.readdir(directory, { withFileTypes: true });
//                             const files = entries.filter((entry) => entry.isFile()).map((entry) => path.join(directory, entry.name));
//                             if (recursive) {
//                                 const folders = entries.filter((entry) => entry.isDirectory());
//                                 for (const folder of folders) {
//                                     const folderPath = path.join(directory, folder.name);
//                                     files.push(...(await listFilesRecursively(folderPath)));
//                                 }
//                             }
//                             return files;
//                         };
                
//                         const files = await listFilesRecursively(absolutePath);
                
//                         // Notify the user
//                         if (files.length === 0) {
//                             this.userMessageContent.push({
//                                 type: "text",
//                                 text: `The directory '${relPath}' is empty.`,
//                             });
//                         } else {
//                             this.userMessageContent.push({
//                                 type: "text",
//                                 text: `Files in directory: ${relPath}`,
//                             });
//                             this.userMessageContent.push({
//                                 type: "text",
//                                 text: files.join("\n"),
//                             });
//                         }
                
//                         // Optionally show file list in webview
//                         this.providerRef.deref()?.postMessageToWebview({
//                             type: "systemMessage",
//                             message: files.length > 0
//                                 ? `Files in directory ${relPath}:\n${files.join("\n")}`
//                                 : `The directory '${relPath}' is empty.`,
//                         });
//                     } catch (err: any) {
//                         // Handle errors
//                         const errorMessage = `Error listing files in directory '${relPath}': ${err.message}`;
//                         pushToolResult(errorMessage);
//                         this.userMessageContent.push({
//                             type: "text",
//                             text: errorMessage,
//                         });
//                     }
                
//                     break;
//                 }
                
                
                
//                 case "attempt_completion": {
//                     this.providerRef.deref()?.postMessageToWebview({
//                         type: "systemMessage",
//                         message: block.params.result,
//                     });
//                     break;
//                 }
//             }
//         // this.isToolInUse = false;
//         // this.providerRef.deref()?.postMessageToWebview({
//         // 	type: "hideToolInUse",
//         // 	toolName: block.name,
//         // });
//     }
//     if (!block.partial) {
//         this.currentStreamingContentIndex++;
//     }
// }