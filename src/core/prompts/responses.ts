// import { Anthropic } from "@anthropic-ai/sdk";
import * as path from "path";
import * as diff from "diff";

// Function for successful tool execution response
export const formatResponse = {
    
    /**
     * Formats a denied tool execution with no feedback.
     * @returns The formatted string for denial without feedback.
     */
    toolDenied: () => `The user denied this operation.`,

    /**
     * Formats a denied tool execution with user feedback.
     * @param feedback - The feedback provided by the user.
     * @returns The formatted string with denial and user feedback.
     */
    toolDeniedWithFeedback: (feedback?: string) =>
        `The user denied this operation and provided the following feedback:\n<feedback>\n${feedback}\n</feedback>`,

    /**
     * Formats an error result when a tool fails to execute.
     * @param error - The error message encountered during tool execution.
     * @returns The formatted string for the error response.
     */
    toolError: (error?: string) => `The tool execution failed with the following error:\n<error>\n${error}\n</error>`,

    /**
     * Formats the result of executing a command or a tool.
     * @param text - The success result text.
     * @returns The formatted result string.
     */
    toolResult: (text: string): string => `Tool executed successfully: ${text}`,

    /**
     * Formats the content read from a file to be logged.
     * @param filePath - The path of the file that was read.
     * @param content - The content read from the file.
     * @returns The formatted string with the file content.
     */
    formatReadFileContent: (filePath: string, content: string): string =>
        `File content from '${filePath}':\n\n${content}`,

    /**
     * Formats the success message when writing to a file.
     * @param filePath - The path of the file that was written to.
     * @returns The formatted string with success information.
     */
    formatWriteFileSuccess: (filePath: string): string =>
        `File successfully written: '${filePath}'`,

    /**
     * Formats the follow-up question and user's response.
     * @param question - The question that was asked.
     * @param response - The user's answer.
     * @returns The formatted string with the question and user's response.
     */
    formatFollowupQuestionResponse: (question: string, response: string): string =>
        `Follow-up question asked: "${question}"\nUser's response: "${response}"`,

    /**
     * Handles missing tool parameter error.
     * @param paramName - The missing parameter name.
     * @returns A formatted string indicating the missing parameter.
     */
    missingToolParameterError: (paramName: string) =>
        `Missing value for required parameter '${paramName}'. Please retry with complete response.\n\n${toolUseInstructionsReminder}`
};


export const formatToolResult = (result: string): string => {
    return `The tool executed successfully with the following result:\n<result>\n${result}\n</result>`;
};

export const formatToolError = (error: string): string => {
    return `The tool execution failed with the following error:\n<error>\n${error}\n</error>`;
};

export const formatReadFileContent = (filePath: string, content: string): string => {
    return `The contents of the file "${filePath}" are as follows:\n<file_content>\n${content}\n</file_content>`;
};

export const formatWriteFileSuccess = (filePath: string): string => {
    return `The file "${filePath}" was successfully written.`;
};

export const formatToolDenied = (): string => {
    return `The user denied the tool request.`;
};

export const formatFollowupQuestionResponse = (question: string, response: string): string => {
    return `The response to the question "${question}" is:\n<response>\n${response}\n</response>`;
};


// Instructions reminder for using tools
const toolUseInstructionsReminder = `# Reminder: Instructions for Tool Use

Tool uses are formatted using XML-style tags. The tool name is enclosed in opening and closing tags, and each parameter is similarly enclosed within its own set of tags. Here's the structure:

<tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</tool_name>

For example:

<attempt_completion>
<result>
I have completed the task...
</result>
</attempt_completion>

Always adhere to this format for all tool uses to ensure proper parsing and execution.`;
