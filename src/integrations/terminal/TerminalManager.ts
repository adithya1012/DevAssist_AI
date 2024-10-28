import * as vscode from "vscode"

declare module "vscode" {
    interface Window {
        onDidStartTerminalShellExecution?: (
            listener: (e: any) => any,
            thisArgs?: any,
            disposables?: vscode.Disposable[]
        ) => vscode.Disposable
    }
}
 
export class TerminalManager {
    private disposables: vscode.Disposable[] = []
 
    constructor() {
        let disposable: vscode.Disposable | undefined
        try {
            disposable = (vscode.window as vscode.Window).onDidStartTerminalShellExecution?.(async (e) => {
                e?.execution?.read()
            })
        } catch (error) {
            console.error("Error setting up onDidEndTerminalShellExecution", error)
        }
        if (disposable) {
            this.disposables.push(disposable)
        }
    }
 
 
    async getOrCreateTerminal(cwd: string) {
        const newTerminalInfo = vscode.window.createTerminal({
            cwd,
            name: "DevAssistAI",
            iconPath: new vscode.ThemeIcon("robot"),
        })
        return newTerminalInfo
    }
 }