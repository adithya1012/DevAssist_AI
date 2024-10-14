import * as vscode from 'vscode';
import pWaitFor from 'p-wait-for';


let chatPanel: vscode.WebviewPanel | undefined;
let terminal: vscode.Terminal | undefined; // Single terminal reference

interface TerminalInfo {
    id: string;
    busy: boolean;
    lastCommand: string;
    terminal: vscode.Terminal;
    shellIntegration?: any;
}

class TerminalProcess {
    waitForShellIntegration: boolean = true;

    // You can define event emitter functionality here to handle process events like 'completed', 'no_shell_integration', etc.
    once(event: string, callback: () => void) {
        // Placeholder for event handling
    }

    run(terminal: vscode.Terminal, command: string) {
        // Implement command execution logic here
    }
}

function mergePromise<T>(promise1: Promise<T>, promise2: Promise<void>): Promise<T> {
    return promise1.then(result => {
        return promise2.then(() => result);
    });
}



// Function to run commands in the terminal with shell integration support
// async function runCommand(terminalInfo: TerminalInfo, command: string): Promise<void> {
//     terminalInfo.busy = true;
//     terminalInfo.lastCommand = command;

//     const process = new TerminalProcess();
//     this.processes.set(terminalInfo.id, process);

//     process.once("completed", () => {
//         terminalInfo.busy = false;
//     });

//     process.once("no_shell_integration", () => {
//         console.log(`no_shell_integration received for terminal ${terminalInfo.id}`);
//         // TerminalRegistry.removeTerminal(terminalInfo.id);
//         this.terminalIds.delete(terminalInfo.id);
//         this.processes.delete(terminalInfo.id);
//     });

//     const promise = new Promise<void>((resolve, reject) => {
//         process.once("continue", () => {
//             resolve();
//         });
//         process.once("error", (error) => {
//             console.error(`Error in terminal ${terminalInfo.id}:`, error);
//             reject(error);
//         });
//     });

//     if (terminalInfo.terminal.shellIntegration) {
//         process.waitForShellIntegration = false;
//         process.run(terminalInfo.terminal, command);
//     } else {
//         pWaitFor(() => terminalInfo.terminal.shellIntegration !== undefined, { timeout: 4000 }).finally(() => {
//             const existingProcess = this.processes.get(terminalInfo.id);
//             if (existingProcess && existingProcess.waitForShellIntegration) {
//                 existingProcess.waitForShellIntegration = false;
//                 existingProcess.run(terminalInfo.terminal, command);
//             }
//         });
//     }
//     // const commandPromise = process.run(terminalInfo.terminal, command);
//     // return mergePromise(commandPromise, promise);
//     return mergePromise(process, promise);
// }

// Function to run commands in the terminal with shell integration support
function runCommand(terminalInfo: TerminalInfo, command: string): Promise<void> {
    terminalInfo.busy = true;
    terminalInfo.lastCommand = command;

    const process = new TerminalProcess();
    this.processes.set(terminalInfo.id, process);

    process.once("completed", () => {
        terminalInfo.busy = false;
    });

    process.once("no_shell_integration", () => {
        console.log(`no_shell_integration received for terminal ${terminalInfo.id}`);
        // TerminalRegistry.removeTerminal(terminalInfo.id);
        this.terminalIds.delete(terminalInfo.id);
        this.processes.delete(terminalInfo.id);
    });

    // Create a Promise to wrap process handling
    return new Promise<void>((resolve, reject) => {
        // Listen for process completion events
        process.once("continue", () => {
            resolve();
        });

        process.once("error", () => {
            console.error(`Error in terminal ${terminalInfo.id}`);
            reject(new Error("Terminal process encountered an error"));
        });

        // If shell integration is available, run the command immediately
        if (terminalInfo.terminal.shellIntegration) {
            process.waitForShellIntegration = false;
            process.run(terminalInfo.terminal, command);
        } else {
            // Wait for shell integration, then run the command
            pWaitFor(() => terminalInfo.terminal.shellIntegration !== undefined, { timeout: 4000 }).finally(() => {
                const existingProcess = this.processes.get(terminalInfo.id);
                if (existingProcess && existingProcess.waitForShellIntegration) {
                    existingProcess.waitForShellIntegration = false;
                    existingProcess.run(terminalInfo.terminal, command);
                }
            });
        }
    });
}


function activate(context: vscode.ExtensionContext) {
    console.log('Extension "chatbot-file-explorer" is now active!');

    let disposable = vscode.commands.registerCommand('devassist_ai.helloWorld', () => {
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
                    if (message.command === 'runInTerminal') {
                        runCommandInTerminal(message.text);
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    });

    context.subscriptions.push(disposable);
}

function getChatbotHtml(): string {
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
                <input type="text" id="user-input" placeholder="Type a command...">
                <button onclick="sendMessage()">Send</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                function sendMessage() {
                    const input = document.getElementById('user-input');
                    const message = input.value;
                    input.value = '';

                    // Check for command to create directory and files
                    const commandParts = message.split(' ');
                    if (commandParts[0] === 'create') {
                        const dirName = commandParts[1];
                        const fileNames = commandParts.slice(2);
                        createDirectoryAndFiles(dirName, fileNames);
                    } else {
                        vscode.postMessage({ command: 'runInTerminal', text: message });
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

function runCommandInTerminal(command: string) {
    if (!terminal) {
        // Create a new terminal if one doesn't exist
        terminal = vscode.window.createTerminal('ChatbotTerminal');
    }
    // Use shell integration to run the command if available
    if ((terminal as any).shellIntegration && (terminal as any).shellIntegration.executeCommand) {
        const execution = (terminal as any).shellIntegration.executeCommand(command);
        const stream = execution.read();
        let output = '';

        (async () => {
            for await (let data of stream) {
                output += data;
            }
            // Clean the output to remove ANSI escape codes
            const cleanOutput = output.replace(/\u001B\[[0-?9;]*[mG]/g, ''); // Removes ANSI escape codes

            // Send the terminal output to the chatbot panel
            if (chatPanel) {
                chatPanel.webview.postMessage({ text: `Terminal Output: ${cleanOutput}` });
            }
        })();
    } else {
        // Fallback to regular terminal command execution
        terminal.show();
        terminal.sendText(command);
    }
}

// Function to create a directory and files in the terminal
function createDirectoryAndFiles(dirName: string, fileNames: string[]) {
    const command = `mkdir ${dirName} && cd ${dirName} && touch ${fileNames.join(' ')}`;
    runCommandInTerminal(command);
}

function deactivate() {
    if (terminal) {
        terminal.dispose();
    }
}

export {
    activate,
    deactivate
};
