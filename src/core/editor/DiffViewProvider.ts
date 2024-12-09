import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { createDirectoriesForFile } from "../../utils/fs";
import { arePathsEqual } from "../../utils/path";
import { formatResponse } from "../../core/prompts/responses";
import { DecorationController } from "./DecorationController";
import * as diff from "diff";

export const DIFF_VIEW_URI_SCHEME = "devassist-diff";

export class DiffViewProvider {
	editType?: "create" | "modify";
	isEditing = false;
	originalContent: string | undefined;
	private createdDirs: string[] = [];
	private documentWasOpen = false;
	private relPath?: string;
	private newContent?: string;
	private activeDiffEditor?: vscode.TextEditor;
	private fadedOverlayController?: DecorationController;
	private activeLineController?: DecorationController;
	private streamedLines: string[] = [];
	private preDiagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [];

	constructor(private cwd: string) {}

	async open(relPath: string): Promise<void> {
		this.relPath = relPath;
		const fileExists = this.editType === "modify";
		const absolutePath = path.resolve(this.cwd, relPath);
		this.isEditing = true;
		// if the file is already open, ensure it's not dirty before getting its contents
		if (fileExists) {
			const existingDocument = vscode.workspace.textDocuments.find((doc) =>
				arePathsEqual(doc.uri.fsPath, absolutePath)
			);
			if (existingDocument && existingDocument.isDirty) {
				await existingDocument.save();
			}
		}

		// get diagnostics before editing the file, we'll compare to diagnostics after editing to see if devassist needs to fix anything
		this.preDiagnostics = vscode.languages.getDiagnostics();

		if (fileExists) {
			this.originalContent = await fs.readFile(absolutePath, "utf-8");
		} else {
			this.originalContent = "";
		}
		// for new files, create any necessary directories and keep track of new directories to delete if the user denies the operation
		this.createdDirs = await createDirectoriesForFile(absolutePath);
		// make sure the file exists before we open it
		if (!fileExists) {
			await fs.writeFile(absolutePath, "");
		}
		// if the file was already open, close it (must happen after showing the diff view since if it's the only tab the column will close)
		this.documentWasOpen = false;
		// close the tab if it's open (it's already saved above)
		const tabs = vscode.window.tabGroups.all
			.map((tg) => tg.tabs)
			.flat()
			.filter(
				(tab) => tab.input instanceof vscode.TabInputText && arePathsEqual(tab.input.uri.fsPath, absolutePath)
			);
		for (const tab of tabs) {
			if (!tab.isDirty) {
				await vscode.window.tabGroups.close(tab);
			}
			this.documentWasOpen = true;
		}
		this.activeDiffEditor = await this.openDiffEditor();
		this.fadedOverlayController = new DecorationController("fadedOverlay", this.activeDiffEditor);
		this.activeLineController = new DecorationController("activeLine", this.activeDiffEditor);
		// Apply faded overlay to all lines initially
		this.fadedOverlayController.addLines(0, this.activeDiffEditor.document.lineCount);
		this.scrollEditorToLine(0); // will this crash for new files?
		this.streamedLines = [];
	}

	async update(accumulatedContent: string, isFinal: boolean) {
		if (!this.relPath || !this.activeLineController || !this.fadedOverlayController) {
			throw new Error("Required values not set");
		}
		this.newContent = accumulatedContent;
		const accumulatedLines = accumulatedContent.split("\n");
		if (!isFinal) {
			accumulatedLines.pop(); // remove the last partial line only if it's not the final update
		}
		const diffLines = accumulatedLines.slice(this.streamedLines.length);

		const diffEditor = this.activeDiffEditor;
		const document = diffEditor?.document;
		if (!diffEditor || !document) {
			throw new Error("User closed text editor, unable to edit file...");
		}

		// Place cursor at the beginning of the diff editor to keep it out of the way of the stream animation
		const beginningOfDocument = new vscode.Position(0, 0);
		diffEditor.selection = new vscode.Selection(beginningOfDocument, beginningOfDocument);

		for (let i = 0; i < diffLines.length; i++) {
			const currentLine = this.streamedLines.length + i;
			// Replace all content up to the current line with accumulated lines
			// This is necessary (as compared to inserting one line at a time) to handle cases where html tags on previous lines are auto closed for example
			const edit = new vscode.WorkspaceEdit();
			const rangeToReplace = new vscode.Range(0, 0, currentLine + 1, 0);
			const contentToReplace = accumulatedLines.slice(0, currentLine + 1).join("\n") + "\n";
			edit.replace(document.uri, rangeToReplace, contentToReplace);
			await vscode.workspace.applyEdit(edit);
			// Update decorations
			this.activeLineController.setActiveLine(currentLine);
			this.fadedOverlayController.updateOverlayAfterLine(currentLine, document.lineCount);
			// Scroll to the current line
			this.scrollEditorToLine(currentLine);
		}
		// Update the streamedLines with the new accumulated content
		this.streamedLines = accumulatedLines;
		if (isFinal) {
			// Handle any remaining lines if the new content is shorter than the original
			if (this.streamedLines.length < document.lineCount) {
				const edit = new vscode.WorkspaceEdit();
				edit.delete(document.uri, new vscode.Range(this.streamedLines.length, 0, document.lineCount, 0));
				await vscode.workspace.applyEdit(edit);
			}
			// Add empty last line if original content had one
			const hasEmptyLastLine = this.originalContent?.endsWith("\n");
			if (hasEmptyLastLine) {
				const accumulatedLines = accumulatedContent.split("\n");
				if (accumulatedLines[accumulatedLines.length - 1] !== "") {
					accumulatedContent += "\n";
				}
			}
			// Clear all decorations at the end (before applying final edit)
			this.fadedOverlayController.clear();
			this.activeLineController.clear();
		}
	}

	async saveChanges(): Promise<{
		userEdits: string | undefined;
		finalContent: string | undefined;
	}> {
		if (!this.relPath || !this.newContent || !this.activeDiffEditor) {
			return { userEdits: undefined, finalContent: undefined };
		}
		const absolutePath = path.resolve(this.cwd, this.relPath);
		const updatedDocument = this.activeDiffEditor.document;
		const editedContent = updatedDocument.getText();
		if (updatedDocument.isDirty) {
			await updatedDocument.save();
		}

		await vscode.window.showTextDocument(vscode.Uri.file(absolutePath), { preview: false });
		await this.closeAllDiffViews();

		// If the edited content has different EOL characters, we don't want to show a diff with all the EOL differences.
		const newContentEOL = this.newContent.includes("\r\n") ? "\r\n" : "\n";
		const normalizedEditedContent = editedContent.replace(/\r\n|\n/g, newContentEOL).trimEnd() + newContentEOL; // trimEnd to fix issue where editor adds in extra new line automatically
		// just in case the new content has a mix of varying EOL characters
		const normalizedNewContent = this.newContent.replace(/\r\n|\n/g, newContentEOL).trimEnd() + newContentEOL;
		if (normalizedEditedContent !== normalizedNewContent) {
			// user made changes before approving edit
			const userEdits = formatResponse.createPrettyPatch(
				this.relPath,
				normalizedNewContent,
				normalizedEditedContent
			);
			return { userEdits, finalContent: normalizedEditedContent };
		} else {
			// no changes to devassist's edits
			return { userEdits: undefined, finalContent: normalizedEditedContent };
		}
	}

	async revertChanges(): Promise<void> {
		if (!this.relPath || !this.activeDiffEditor) {
			return;
		}
		const fileExists = this.editType === "modify";
		const updatedDocument = this.activeDiffEditor.document;
		const absolutePath = path.resolve(this.cwd, this.relPath);
		if (!fileExists) {
			if (updatedDocument.isDirty) {
				await updatedDocument.save();
			}
			await this.closeAllDiffViews();
			await fs.unlink(absolutePath);
			// Remove only the directories we created, in reverse order
			for (let i = this.createdDirs.length - 1; i >= 0; i--) {
				await fs.rmdir(this.createdDirs[i]);
				console.log(`Directory ${this.createdDirs[i]} has been deleted.`);
			}
			console.log(`File ${absolutePath} has been deleted.`);
		} else {
			// revert document
			const edit = new vscode.WorkspaceEdit();
			const fullRange = new vscode.Range(
				updatedDocument.positionAt(0),
				updatedDocument.positionAt(updatedDocument.getText().length)
			);
			edit.replace(updatedDocument.uri, fullRange, this.originalContent ?? "");
			// Apply the edit and save, since contents shouldnt have changed this wont show in local history unless of course the user made changes and saved during the edit
			await vscode.workspace.applyEdit(edit);
			await updatedDocument.save();
			console.log(`File ${absolutePath} has been reverted to its original content.`);
			if (this.documentWasOpen) {
				await vscode.window.showTextDocument(vscode.Uri.file(absolutePath), {
					preview: false,
				});
			}
			await this.closeAllDiffViews();
		}

		// edit is done
		await this.reset();
	}

	private async closeAllDiffViews() {
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff && tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME
			);
		for (const tab of tabs) {
			// trying to close dirty views results in save popup
			if (!tab.isDirty) {
				await vscode.window.tabGroups.close(tab);
			}
		}
	}

	private async openDiffEditor(): Promise<vscode.TextEditor> {
		if (!this.relPath) {
			throw new Error("No file path set");
		}
		const uri = vscode.Uri.file(path.resolve(this.cwd, this.relPath));
		// If this diff editor is already open (ie if a previous write file was interrupted) then we should activate that instead of opening a new diff
		const diffTab = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.find(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff &&
					tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME &&
					arePathsEqual(tab.input.modified.fsPath, uri.fsPath)
			);
		if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
			const editor = await vscode.window.showTextDocument(diffTab.input.modified);
			return editor;
		}
		// Open new diff editor
		return new Promise<vscode.TextEditor>((resolve, reject) => {
			const fileName = path.basename(uri.fsPath);
			const fileExists = this.editType === "modify";
			const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
				if (editor && arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
					disposable.dispose();
					resolve(editor);
				}
			});
			vscode.commands.executeCommand(
				"vscode.diff",
				vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${fileName}`).with({
					query: Buffer.from(this.originalContent ?? "").toString("base64"),
				}),
				uri,
				`${fileName}: ${fileExists ? "Original ↔ devassists's Changes" : "New File"} (Editable)`
			);
			// This may happen on very slow machines ie project idx
			setTimeout(() => {
				disposable.dispose();
				reject(new Error("Failed to open diff editor, please try again..."));
			}, 10_000);
		});
	}

	private scrollEditorToLine(line: number) {
		if (this.activeDiffEditor) {
			const scrollLine = line + 4;
			this.activeDiffEditor.revealRange(
				new vscode.Range(scrollLine, 0, scrollLine, 0),
				vscode.TextEditorRevealType.InCenter
			);
		}
	}

	scrollToFirstDiff() {
		if (!this.activeDiffEditor) {
			return;
		}
		const currentContent = this.activeDiffEditor.document.getText();
		const diffs = diff.diffLines(this.originalContent || "", currentContent);
		let lineCount = 0;
		for (const part of diffs) {
			if (part.added || part.removed) {
				// Found the first diff, scroll to it
				this.activeDiffEditor.revealRange(
					new vscode.Range(lineCount, 0, lineCount, 0),
					vscode.TextEditorRevealType.InCenter
				);
				return;
			}
			if (!part.removed) {
				lineCount += part.count || 0;
			}
		}
	}

	// close editor if open?
	async reset() {
		this.editType = undefined;
		this.isEditing = false;
		this.originalContent = undefined;
		this.createdDirs = [];
		this.documentWasOpen = false;
		this.activeDiffEditor = undefined;
		this.fadedOverlayController = undefined;
		this.activeLineController = undefined;
		this.streamedLines = [];
		this.preDiagnostics = [];
	}
}
