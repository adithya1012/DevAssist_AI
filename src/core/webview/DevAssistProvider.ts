import * as vscode from "vscode";
import { getNonce } from "./getNonce";
import { getUri } from "./getUri";
import { DevAssist } from "..";
import { ApiProvider } from "../../shared/api";

export const GlobalFileNames = {
	apiConversationHistory: "api_conversation_history.json",
	uiMessages: "ui_messages.json",
};

export class DevAssistProvider implements vscode.WebviewViewProvider {
	public static readonly sideBarId = "devassist_ai.SidebarProvider"; // used in package.json as the view's id. This value cannot be changed due to how vscode caches views based on their id, and updating the id would break existing instances of the extension.
	public static readonly tabPanelId = "devassist_ai.TabPanelProvider";
	private static activeInstances: Set<DevAssistProvider> = new Set();
	private disposables: vscode.Disposable[] = [];
	private view?: vscode.WebviewView | vscode.WebviewPanel;
	private devAssist?: DevAssist;
	constructor(readonly context: vscode.ExtensionContext, private readonly outputChannel: vscode.OutputChannel) {
		this.outputChannel.appendLine("DevAssistProvider instantiated");
		DevAssistProvider.activeInstances.add(this);
	}

	/*
	VSCode extensions use the disposable pattern to clean up resources when the sidebar/editor tab is closed by the user or system. This applies to event listening, commands, interacting with the UI, etc.
	- https://vscode-docs.readthedocs.io/en/stable/extensions/patterns-and-principles/
	- https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
	*/
	async dispose() {
		this.outputChannel.appendLine("Disposing DevAssistProvider...");
		this.outputChannel.appendLine("Cleared task");
		if (this.view && "dispose" in this.view) {
			this.view.dispose();
			this.outputChannel.appendLine("Disposed webview");
		}
		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
		this.outputChannel.appendLine("Disposed all disposables");
		DevAssistProvider.activeInstances.delete(this);
	}

	resolveWebviewView(
		webviewView: vscode.WebviewView | vscode.WebviewPanel
		//context: vscode.WebviewViewResolveContext<unknown>, used to recreate a deallocated webview, but we don't need this since we use retainContextWhenHidden
		//token: vscode.CancellationToken
	): void | Thenable<void> {
		this.outputChannel.appendLine("Resolving webview view");
		this.view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri],
		};
		webviewView.webview.html = this.getHtmlContent(webviewView.webview);

		this.setWebviewMessageListener(webviewView.webview);
		// Listen for when the panel becomes visible
		// https://github.com/microsoft/vscode-discussions/discussions/840
		if ("onDidChangeViewState" in webviewView) {
			// WebviewView and WebviewPanel have all the same properties except for this visibility listener
			// panel
			webviewView.onDidChangeViewState(
				() => {
					if (this.view?.visible) {
						console.log("Panel became visible");
					}
				},
				null,
				this.disposables
			);
		} else if ("onDidChangeVisibility" in webviewView) {
			// sidebar
			webviewView.onDidChangeVisibility(
				() => {
					if (this.view?.visible) {
						console.log("Sidebar became visible");
					}
				},
				null,
				this.disposables
			);
		}

		// Listen for when the view is disposed
		// This happens when the user closes the view or when the view is closed programmatically
		webviewView.onDidDispose(
			async () => {
				await this.dispose();
			},
			null,
			this.disposables
		);

		// Listen for when color changes
		vscode.workspace.onDidChangeConfiguration(
			async (e) => {
				if (e && e.affectsConfiguration("workbench.colorTheme")) {
					// Sends latest theme name to webview
					// await this.postMessageToWebview({ type: "theme", text: JSON.stringify(await getTheme()) });
				}
			},
			null,
			this.disposables
		);

		// if the extension is starting a new session, clear previous task state
		this.outputChannel.appendLine("Webview view resolved");
	}

	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			async (message: any) => {
				switch (message.type) {
					case "webviewDidLaunch":
						await this.postMessageToWebview({ type: "extensionDidLaunch" });
						break;
					case "newTask":
						await this.initNewTask(message.text);
						break;
					case "askQuestion":
						// await this.askQuestion(message.text);
						await this.initNewTask(message.text);
						break;
				}
			},
			null,
			this.disposables
		);
	}

	async initNewTask(task?: string, images?: string[]) {
		await this.clearTask();

		// const apiProvider: ApiProvider = "openai";
		const apiProvider: ApiProvider = "gemini";
		const apiModelId: string = "";
		const apiKey: string = "";
		const anthropicBaseUrl: string = "";
		const openAiBaseUrl: string = "";
		const openAiApiKey: string = "";
		const openAiModelId: string = "gpt-4o";
		const ollamaModelId: string = "";
		const ollamaBaseUrl: string = "";
		const geminiApiKey: string = "AIzaSyBbHuq0cjwXbfQipY6-azZWSEVUSB-Uc9I";

		this.devAssist = new DevAssist(
			this,
			{
				apiProvider,
				apiModelId,
				apiKey,
				anthropicBaseUrl,
				openAiBaseUrl,
				openAiApiKey,
				openAiModelId,
				ollamaModelId,
				ollamaBaseUrl,
				geminiApiKey,
			},
			task
		);
	}

	async askQuestion(text?: string) {
		await this.devAssist?.say("text", text);
	}

	// Send any JSON serializable data to the react app
	async postMessageToWebview(message: any) {
		await this.view?.webview.postMessage(message);
	}

	async postStateToWebview() {
		this.postMessageToWebview({
			type: "state",
			state: {
				messages: this.devAssist?.messages || [],
			},
		});
	}

	/**
	 * Defines and returns the HTML that should be rendered within the webview panel.
	 *
	 * @remarks This is also the place where references to the React webview build files
	 * are created and inserted into the webview HTML.
	 *
	 * @param webview A reference to the extension webview
	 * @param extensionUri The URI of the directory containing the extension
	 * @returns A template string literal containing the HTML that should be
	 * rendered within the webview panel
	 */
	private getHtmlContent(webview: vscode.Webview): string {
		// Get the local path to main script run in the webview,
		// then convert it to a uri we can use in the webview.

		// The CSS file from the React build output
		const stylesUri = getUri(webview, this.context.extensionUri, [
			"webview-ui",
			"build",
			"static",
			"css",
			"main.css",
		]);
		// The JS file from the React build output
		const scriptUri = getUri(webview, this.context.extensionUri, [
			"webview-ui",
			"build",
			"static",
			"js",
			"main.js",
		]);

		// The codicon font from the React build output
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts
		// we installed this package in the extension so that we can access it how its intended from the extension (the font file is likely bundled in vscode), and we just import the css fileinto our react app we don't have access to it
		// don't forget to add font-src ${webview.cspSource};
		const codiconsUri = getUri(webview, this.context.extensionUri, [
			"node_modules",
			"@vscode",
			"codicons",
			"dist",
			"codicon.css",
		]);

		// const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "main.js"))

		// const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "reset.css"))
		// const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "vscode.css"))

		// // Same for stylesheet
		// const stylesheetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "main.css"))

		// Use a nonce to only allow a specific script to be run.
		/*
        content security policy of your webview to only allow scripts that have a specific nonce
        create a content security policy meta tag so that only loading scripts with a nonce is allowed
        As your extension grows you will likely want to add custom styles, fonts, and/or images to your webview. If you do, you will need to update the content security policy meta tag to explicity allow for these resources. E.g.
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
		- 'unsafe-inline' is required for styles due to vscode-webview-toolkit's dynamic style injection
		- since we pass base64 images to the webview, we need to specify img-src ${webview.cspSource} data:;

        in meta tag we add nonce attribute: A cryptographic nonce (only used once) to allow scripts. The server must generate a unique nonce value each time it transmits a policy. It is critical to provide a nonce that cannot be guessed as bypassing a resource's policy is otherwise trivial.
        */
		const nonce = getNonce();

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
            <link rel="stylesheet" type="text/css" href="${stylesUri}">
			<link href="${codiconsUri}" rel="stylesheet" />
            <title>DevAssistAI</title>
          </head>
          <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
          </body>
        </html>
      `;
	}

	async clearTask() {
		this.devAssist?.abortTask();
		this.devAssist = undefined;
	}
}
