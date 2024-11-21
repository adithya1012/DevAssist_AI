export type AssistantMessageContent = TextContent | ToolUse;

export { parseAssistantMessage } from "./parse-assistant-message";

export interface TextContent {
	type: "text";
	content: string;
	partial: boolean;
}

export const toolUseNames = [
	//TODO: Add more tool names as needed
	"execute_command",
	"read_file",
	"write_to_file",
	"list_files",
	"ask_followup_question",
	"attempt_completion",
] as const;

// Converts array of tool call names into a union type ("execute_command" | "read_file" | ...)
export type ToolUseName = (typeof toolUseNames)[number];

export const toolParamNames = [
	"command",
	"path",
	"content",
	"regex",
	"file_pattern",
	"recursive",
	"question",
	"result",
] as const;

export type ToolParamName = (typeof toolParamNames)[number];

export interface ToolUse {
	type: "tool_use";
	name: ToolUseName;
	params: Partial<Record<ToolParamName, string>>;
	partial: boolean;
}

export interface ExecuteCommandToolUse extends ToolUse {
	name: "execute_command";
	params: Partial<Pick<Record<ToolParamName, string>, "command">>;
}

export interface ReadFileToolUse extends ToolUse {
	name: "read_file";
	params: Partial<Pick<Record<ToolParamName, string>, "path">>;
}

export interface WriteToFileToolUse extends ToolUse {
	name: "write_to_file";
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "content">>;
}

export interface AskFollowupQuestionToolUse extends ToolUse {
	name: "ask_followup_question"
	params: Partial<Pick<Record<ToolParamName, string>, "question">>
}

export interface AttemptCompletionToolUse extends ToolUse {
	name: "attempt_completion";
	params: Partial<Pick<Record<ToolParamName, string>, "result" | "command">>;
}
