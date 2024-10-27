// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'

import { ApiConfiguration, ModelInfo } from "./api"








export interface ClineSayTool {
	tool:
		| "editedExistingFile"
		| "newFileCreated"
		| "readFile"
		| "listFilesTopLevel"
		| "listFilesRecursive"
		| "listCodeDefinitionNames"
		| "searchFiles"
		| "inspectSite"
	path?: string
	diff?: string
	content?: string
	regex?: string
	filePattern?: string
}



export type ClineApiReqCancelReason = "streaming_failed" | "user_cancelled"
