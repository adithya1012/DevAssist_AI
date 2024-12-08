// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { DevAssistProvider } from "./core/webview/DevAssistProvider";
import { DIFF_VIEW_URI_SCHEME } from "./core/editor/DiffViewProvider";

let outputChannel: vscode.OutputChannel;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel("DevAssist");
	context.subscriptions.push(outputChannel);

	outputChannel.appendLine("DevAssist AI is now active");

	const sidebarProvider = new DevAssistProvider(context, outputChannel);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DevAssistProvider.sideBarId, sidebarProvider, {
			webviewOptions: {
				retainContextWhenHidden: true,
			},
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("devassist_ai.buttonClicked", async () => {
			outputChannel.appendLine("Button Clicked");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("devassist_ai.plusButtonClicked", async () => {
			outputChannel.appendLine("Plus button Clicked");
			await sidebarProvider.clearTask();
			// await sidebarProvider.postStateToWebview()
			await sidebarProvider.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
		})
	);

	const openDevAssistInNewTab = async () => {
		outputChannel.appendLine("Opening DevAssist in new tab");
		// (this example uses webviewProvider activation event which is necessary to deserialize cached webview, but since we use retainContextWhenHidden, we don't need to use that event)
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
		const tabProvider = new DevAssistProvider(context, outputChannel);
		//const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
		const lastCol = Math.max(...vscode.window.visibleTextEditors.map((editor) => editor.viewColumn || 0));

		// Check if there are any visible text editors, otherwise open a new group to the right
		const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0;
		if (!hasVisibleEditors) {
			await vscode.commands.executeCommand("workbench.action.newGroupRight");
		}
		const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two;

		const panel = vscode.window.createWebviewPanel(DevAssistProvider.tabPanelId, "DevAssist", targetCol, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [context.extensionUri],
		});
		// TODO: use better svg icon with light and dark variants (see https://stackoverflow.com/questions/58365687/vscode-extension-iconpath)

		panel.iconPath = {
			light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_light.png"),
			dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_dark.png"),
		};
		tabProvider.resolveWebviewView(panel);

		// Lock the editor group so clicking on files doesn't open them over the panel
		// await delay(100);
		await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
	};

	context.subscriptions.push(
		vscode.commands.registerCommand("devassist_ai.popoutButtonClicked", openDevAssistInNewTab)
	);

	const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8");
		}
	})();
	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("devassist_ai.settingsButtonClicked", () => {
			//vscode.window.showInformationMessage(message)
			sidebarProvider.postMessageToWebview({ type: "action", action: "settingsButtonClicked" });
		})
	);
	context.subscriptions.push(vscode.commands.registerCommand("devassist_ai.openInNewTab", openDevAssistInNewTab));
}

// This method is called when your extension is deactivated
export function deactivate() {
	outputChannel.appendLine("DevAssist AI extension deactivated");
}
