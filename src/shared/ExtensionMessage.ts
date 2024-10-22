// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'

import { ApiConfiguration, ModelInfo } from "./api";
import { HistoryItem } from "./HistoryItem";

// webview will hold state
export interface ExtensionMessage {
	type:
		| "action"
		| "state"
		| "selectedImages"
		| "ollamaModels"
		| "theme"
		| "workspaceUpdated"
		| "invoke"
		| "partialMessage";
	text?: string;
	action?: "chatButtonClicked" | "settingsButtonClicked" | "historyButtonClicked" | "didBecomeVisible";
	invoke?: "sendMessage" | "primaryButtonClick" | "secondaryButtonClick";
	state?: ExtensionState;
	images?: string[];
	ollamaModels?: string[];
	filePaths?: string[];
	partialMessage?: DevAssistMessage;
}

export interface ExtensionState {
	version: string;
	apiConfiguration?: ApiConfiguration;
	customInstructions?: string;
	alwaysAllowReadOnly?: boolean;
	uriScheme?: string;
	DevAssistMessages: DevAssistMessage[];
	taskHistory: HistoryItem[];
	shouldShowAnnouncement: boolean;
}

export interface DevAssistMessage {
	ts: number;
	type: "ask" | "say";
	ask?: DevAssistAsk;
	say?: DevAssistSay;
	text?: string;
	images?: string[];
	partial?: boolean;
}

export type DevAssistAsk =
	| "followup"
	| "command"
	| "command_output"
	| "completion_result"
	| "tool"
	| "api_req_failed"
	| "resume_task"
	| "resume_completed_task"
	| "mistake_limit_reached";

export type DevAssistSay =
	| "task"
	| "error"
	| "api_req_started"
	| "api_req_finished"
	| "text"
	| "completion_result"
	| "user_feedback"
	| "user_feedback_diff"
	| "api_req_retried"
	| "command_output"
	| "tool"
	| "shell_integration_warning"
	| "inspect_site_result";

export interface DevAssistSayTool {
	tool:
		| "editedExistingFile"
		| "newFileCreated"
		| "readFile"
		| "listFilesTopLevel"
		| "listFilesRecursive"
		| "listCodeDefinitionNames"
		| "searchFiles"
		| "inspectSite";
	path?: string;
	diff?: string;
	content?: string;
	regex?: string;
	filePattern?: string;
}

export interface DevAssistApiReqInfo {
	request?: string;
	tokensIn?: number;
	tokensOut?: number;
	cacheWrites?: number;
	cacheReads?: number;
	cost?: number;
	cancelReason?: DevAssistApiReqCancelReason;
	streamingFailedMessage?: string;
}

export type DevAssistApiReqCancelReason = "streaming_failed" | "user_cancelled";
