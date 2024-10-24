import { Anthropic } from "@anthropic-ai/sdk";
import delay from "delay";
import fs from "fs/promises";
import os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { SYSTEM_PROMPT, addCustomInstructions } from "./prompts/system";
import { 
    formatToolResult, 
    formatToolError, 
    formatReadFileContent, 
    formatWriteFileSuccess, 
    formatToolDenied, 
    formatFollowupQuestionResponse 
} from "./prompts/responses";

// Get the current working directory. If the workspace folders are undefined, default to the user's Desktop directory.
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop");

export class DevAI {
    // Conversation history between the system and the AI assistant.
    apiConversationHistory: Anthropic.MessageParam[] = [];
    private customInstructions?: string; // Optional custom instructions provided by the user.

    constructor(customInstructions?: string) {
        this.customInstructions = customInstructions;
    }

    /**
     * Starts a new task based on the provided input task.
     * @param task - The task provided by the user.
     */
    // async startTask(task?: string) {
    //     // Build the system prompt, appending custom instructions if available.
    //     const systemPrompt = SYSTEM_PROMPT(cwd, true) + (this.customInstructions ? addCustomInstructions(this.customInstructions) : "");
    //     this.apiConversationHistory.push({ role: "system", content: systemPrompt });

    //     // If a task is provided by the user, push it to the conversation history as user input.
    //     if (task) {
    //         this.apiConversationHistory.push({ role: "user", content: `<task>\n${task}\n</task>` });
    //     }

    //     // Start the main task loop.
    //     await this.runTaskLoop();
    // }

    async startTask(task?: string) {
        // Build the system prompt, appending custom instructions if available.
        const systemPrompt = SYSTEM_PROMPT(cwd, true) + (this.customInstructions ? addCustomInstructions(this.customInstructions) : "");
    
        // The system prompt is not pushed to conversation history, since it's not a "user" or "assistant" message.
        if (task) {
            // Only push user tasks to the conversation history
            this.apiConversationHistory.push({ role: "user", content: `<task>\n${task}\n</task>` });
        }
    
        // Start the main task loop.
        await this.runTaskLoop();
    }
    

    /**
     * The main loop that processes user input, executes tools, and generates responses.
     */
    private async runTaskLoop() {
        let continueLoop = true;

        // Continue processing tasks until the loop is terminated.
        while (continueLoop) {
            const assistantResponse = await this.makeApiRequest(); // Simulates an API call.
            continueLoop = await this.handleAssistantResponse(assistantResponse); // Handle the AI assistant's response.
        }
    }

    /**
     * Simulates an API request to get a response from the AI assistant.
     * @returns A simulated response from the assistant.
     */
    private async makeApiRequest(): Promise<Anthropic.MessageParam> {
        await delay(500); // Simulate an API delay.
        return {
            role: "assistant",
            content: "Let me know what tool you'd like to use."
        };
    }

    /**
     * Handles the AI assistant's response, checking for specific tool requests like executing commands or reading/writing files.
     * @param response - The AI assistant's response.
     * @returns A boolean indicating whether to continue the task loop.
     */
    private async handleAssistantResponse(response: Anthropic.MessageParam): Promise<boolean> {
        this.apiConversationHistory.push(response);

        // Handle tool usage based on the assistant's response content.
        if (typeof response.content === 'string' && response.content.includes("<execute_command>")) {
            const command = this.extractTagContent(response.content, "command");
            if (command) {
                return await this.executeCommandTool(command);
            }
        } else if ((response.content as string).includes("<read_file>")) {
            const filePath = typeof response.content === 'string' ? this.extractTagContent(response.content, "path") : null;
            if (filePath) {
                return await this.readFileTool(filePath);
            }
        } else if ((response.content as string).includes("<write_to_file>")) {
            const filePath = typeof response.content === 'string' ? this.extractTagContent(response.content, "path") : null;
            const content = typeof response.content === 'string' ? this.extractTagContent(response.content, "content") : null;
            if (filePath && content) {
                return await this.writeFileTool(filePath, content);
            }
        } else if ((response.content as string).includes("<ask_followup_question>")) {
            const question = typeof response.content === 'string' ? this.extractTagContent(response.content, "question") : null;
            if (question) {
                return await this.askFollowupQuestionTool(question);
            }
        }

        return true; // Continue the task loop.
    }

    /**
     * Extracts the content between XML-style tags in the response content.
     * @param content - The full content string containing XML-style tags.
     * @param tag - The tag whose content you want to extract.
     * @returns The content inside the specified tag, or null if the tag isn't found.
     */
    private extractTagContent(content: string, tag: string): string | null {
        const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`);
        const match = content.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Executes a CLI command in the terminal and logs the result.
     * @param command - The command to execute.
     * @returns A boolean indicating success or failure.
     */
    private async executeCommandTool(command: string): Promise<boolean> {
        try {
            const terminal = vscode.window.createTerminal("DevAI Terminal"); // Create a new terminal in VS Code.
            terminal.show(); // Show the terminal.
            terminal.sendText(command); // Send the command to the terminal.
            await delay(2000); // Simulate command execution time.

            // Add the success result to the conversation history.
            this.apiConversationHistory.push({
                role: "assistant",
                content: formatToolResult(`Command executed: ${command}`)
            });

            return true;
        } catch (error) {
            // Log the error if the command fails.
            this.apiConversationHistory.push({
                role: "assistant",
                content: formatToolError(`Failed to execute command: ${command}`)
            });
            return false;
        }
    }

    /**
     * Reads the content of a file from the given path and logs the result.
     * @param filePath - The path of the file to read.
     * @returns A boolean indicating success or failure.
     */
    private async readFileTool(filePath: string): Promise<boolean> {
        try {
            const absolutePath = path.resolve(cwd, filePath); // Resolve the absolute path of the file.
            const content = await fs.readFile(absolutePath, "utf8"); // Read the file's content.

            // Log the file content to the conversation history.
            this.apiConversationHistory.push({
                role: "assistant",
                content: formatReadFileContent(filePath, content)
            });

            return true;
        } catch (error) {
            // Log the error if reading the file fails.
            this.apiConversationHistory.push({
                role: "assistant",
                content: formatToolError(`Failed to read file: ${filePath}`)
            });
            return false;
        }
    }

    /**
     * Writes content to a file at the given path and logs the result.
     * @param filePath - The path of the file to write to.
     * @param content - The content to write to the file.
     * @returns A boolean indicating success or failure.
     */
    private async writeFileTool(filePath: string, content: string): Promise<boolean> {
        try {
            const absolutePath = path.resolve(cwd, filePath); // Resolve the absolute path of the file.
            await fs.writeFile(absolutePath, content, "utf8"); // Write the content to the file.

            // Log the success result to the conversation history.
            this.apiConversationHistory.push({
                role: "assistant",
                content: formatWriteFileSuccess(filePath)
            });

            return true;
        } catch (error) {
            // Log the error if writing to the file fails.
            this.apiConversationHistory.push({
                role: "assistant",
                content: formatToolError(`Failed to write to file: ${filePath}`)
            });
            return false;
        }
    }

    /**
     * Asks the user a follow-up question and logs their response.
     * @param question - The question to ask the user.
     * @returns A boolean indicating whether the follow-up was successful.
     */
    private async askFollowupQuestionTool(question: string): Promise<boolean> {
        const response = await vscode.window.showInputBox({
            prompt: question, // Prompt the user with the question.
            placeHolder: "Type your answer..." // Placeholder text for the input box.
        });

        if (response) {
            // Log the user's response to the conversation history.
            this.apiConversationHistory.push({
                role: "assistant",
                content: formatFollowupQuestionResponse(question, response)
            });
            return true;
        }

        return false;
    }
}
