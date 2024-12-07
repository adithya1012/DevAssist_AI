import * as vscode from "vscode"
import { DevAssistProvider } from "../core/webview/DevAssistProvider";
import { DevassistAPI } from "./devassist";


export function createClineAPI(outputChannel: vscode.OutputChannel, sidebarProvider: DevAssistProvider): DevassistAPI {
	const api: DevassistAPI = {


		startNewTask: async (task?: string, images?: string[]) => {
			outputChannel.appendLine("Starting new task")
			await sidebarProvider.clearTask()
			await sidebarProvider.postStateToWebview()
			await sidebarProvider.postMessageToWebview({ type: "action", action: "chatButtonClicked" })
			await sidebarProvider.postMessageToWebview({
				type: "invoke",
				invoke: "sendMessage",
				text: task,
				images: images,
			})
			outputChannel.appendLine(
				`Task started with message: ${task ? `"${task}"` : "undefined"} and ${images?.length || 0} image(s)`
			)
		},



	}

	return api
}
