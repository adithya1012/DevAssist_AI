import { ApiConfiguration } from "./api";

export interface WebviewMessage {
	type:
		| "apiConfiguration"
		| "customInstructions"
		| "alwaysAllowReadOnly"
		| "webviewDidLaunch"
		| "newTask"
		| "askResponse"
		| "clearTask"
		| "didShowAnnouncement"
		| "selectImages"
		| "exportCurrentTask"
		| "showTaskWithId"
		| "deleteTaskWithId"
		| "exportTaskWithId"
		| "resetState"
		| "requestOllamaModels"
		| "openImage"
		| "openFile"
		| "openMention"
		| "cancelTask";
	text?: string;
	askResponse?: DevAssistAskResponse;
	apiConfiguration?: ApiConfiguration;
	images?: string[];
	bool?: boolean;
}

export type DevAssistAskResponse = "yesButtonClicked" | "noButtonClicked" | "messageResponse";
