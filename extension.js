const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let chatPanel;

function activate(context) {
	console.log('Extension "chatbot-file-explorer" is now active!');

	let disposable = vscode.commands.registerCommand('chatbot-file-explorer.openChatbot', function () {
		if (chatPanel) {
			chatPanel.reveal(vscode.ViewColumn.One);
		} else {
			chatPanel = vscode.window.createWebviewPanel(
				'chatbotPanel',
				'Chatbot',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);

			chatPanel.webview.html = getChatbotHtml();

			chatPanel.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
						case 'getFiles':
							sendFileList();
							break;
						case 'openFile':
							console.log("OPENING A FILE 33");
							openFile(message.filePath);
							// runTerminalCommand(message.filePath);
							break;
						case 'runTerminalCommand':
							runTerminalCommand(message.cmd);
							break;
					}
				},
				undefined,
				context.subscriptions
			);
		}
	});

	context.subscriptions.push(disposable);
}

function getChatbotHtml() {
	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chatbot</title>
            <style>
                body { font-family: Arial, sans-serif; }
                #chat-container { height: 80vh; overflow-y: auto; }
                #input-container { position: fixed; bottom: 0; width: 100%; }
            </style>
        </head>
        <body>
            <div id="chat-container"></div>
            <div id="input-container">
                <input type="text" id="user-input" placeholder="Type a message...">
                <button onclick="sendMessage()">Send</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                function sendMessage() {
                    const input = document.getElementById('user-input');
                    const message = input.value;
                    input.value = '';

                    if (message.startsWith('/files')) {
                        vscode.postMessage({ command: 'getFiles' });
                    } else if (message.startsWith('/open ')) {
					 	console.log("OPENING A FILE ");
                        const filePath = message.substring(6);
                        vscode.postMessage({ command: 'openFile', filePath });
                    } else if (message.startsWith('/terminal ')) {
                        const cmd = message.substring(10);
                        vscode.postMessage({ command: 'runTerminalCommand', cmd });
                    } else {
                        console.log("Other Converzations");
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    const chatContainer = document.getElementById('chat-container');
                    chatContainer.innerHTML += \`<p>\${message.text}</p>\`;
                });
            </script>
        </body>
        </html>
    `;
}

function sendFileList() {
	if (!vscode.workspace.workspaceFolders) {
		chatPanel.webview.postMessage({ text: 'No workspace folder open' });
		return;
	}

	const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const files = getFiles(rootPath);
	chatPanel.webview.postMessage({ text: 'Files in workspace:\n' + files.join('\n') });
}

function getFiles(dir) {
	let results = [];
	const list = fs.readdirSync(dir);
	list.forEach(file => {
		file = path.join(dir, file);
		const stat = fs.statSync(file);
		if (stat && stat.isDirectory()) {
			results = results.concat(getFiles(file));
		} else {
			results.push(file);
		}
	});
	return results;
}

function openFile(filePath) {
	console.log('open file in 130');
	vscode.workspace.openTextDocument(filePath).then(doc => {
		vscode.window.showTextDocument(doc);
	});
}

function runTerminalCommand(command) {
	console.log(command);
	const terminal = vscode.window.createTerminal('Extension');
	terminal.show();
	terminal.sendText(command);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};