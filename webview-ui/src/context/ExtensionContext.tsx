import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useEvent } from "react-use";
import { vscode } from "../utils/vscode";
import { findLastIndex } from "../../../src/shared/array";
import {ExtensionState} from "../../../src/shared/ExtensionMessage"


import {
	ApiConfiguration,
	ModelInfo,

} from "../../../src/shared/api"

interface ExtensionContextType extends ExtensionState {
	showWelcome: boolean;
	showThinking: boolean;
	showToolInUse: {
		show: boolean;
		tool: string;
	};
	apiConfiguration?: ApiConfiguration;
	assistantMessages: { [key: string]: any }[];
	addAssistantMessage: (message: any) => void;
	setCustomInstructions: (value?: string) => void
	setAlwaysAllowReadOnly: (value: boolean) => void
	setShowAnnouncement: (value: boolean) => void
	setApiConfiguration: (config: ApiConfiguration) => void
	newTask: boolean;
	setNewTask: (value: boolean) => void;
	clearAssistantMessages: () => void;
}

const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

export const ExtensionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

	const [state, setState] = useState<{
		assistantMessages: { [key: string]: any }[];
		taskHistory: any[];
		version: string;
		shouldShowAnnouncement: boolean;
	}>({
		version: "",
		assistantMessages: [{ role: "assistant", content: "Hi! I am DevAssistAI." }],
		taskHistory: [],
		shouldShowAnnouncement: false,

	});

	const [showWelcome, setShowWelcome] = useState(false);
	const [showThinking, setShowThinking] = useState(false);
	const [showToolInUse, setShowToolInUse] = useState({
		show: false,
		tool: "",
	});
	const [newTask, setNewTask] = useState(true);

	const handleMessage = useCallback((event: MessageEvent) => {
		const message: any = event.data;
		switch (message.type) {
			// case "state": {
			// 	setState(message.state!);
			// 	break;
			// }
			case "systemMessage": {
				setState((prevState) => {
					const assistantMessages = [
						...prevState.assistantMessages,
						{ role: "assistant", content: message.message },
					];
					return {
						...prevState,
						assistantMessages,
					};
				});
				break;
			}
			case "showThinking": {
				setShowThinking(true);
				break;
			}
			case "hideThinking": {
				setShowThinking(false);
				break;
			}
			case "showToolInUse": {
				setShowToolInUse({
					show: true,
					tool: message.toolName,
				});
				break;
			}
			case "hideToolInUse": {
				setShowToolInUse({
					show: false,
					tool: "",
				});
				break;
			}
			case "askFollowup": {
				console.log("partialMessage *******", message);
				break;
			}
		}
	}, []);

	useEvent("message", handleMessage);

	useEffect(() => {
		// console.log("Extension context provider mounted with webviewDidLaunch");
		vscode.postMessage({ type: "webviewDidLaunch" });
	}, []);
	const addAssistantMessage = useCallback((message: string) => {
		setState((prevState) => {
			const assistantMessages = [...prevState.assistantMessages, { role: "user", content: message }];
			return {
				...prevState,
				assistantMessages,
			};
		});
	}, []);
	const contextValue: ExtensionContextType = {
		...state,
		showWelcome,
		showThinking,
		showToolInUse,
		newTask, // Expose `newTask`
		setNewTask, // Expose `setNewTask`
		addAssistantMessage,

		clearAssistantMessages: () => {
			setState((prevState) => {
				console.log("Previous Assistant Messages:", prevState.assistantMessages);
				
				const newState = {
					version: "",
					assistantMessages: [{ role: "assistant", content: "Hi! I am DevAssistAI." }],
					taskHistory: [],
					shouldShowAnnouncement: false,
				};
		
				// Use setTimeout to log after state update
				setTimeout(() => {
					console.log("New Assistant Messages:", newState.assistantMessages);
				}, 0);
		
				return newState;
			});
		},
		setApiConfiguration: (value) => setState((prevState) => ({ ...prevState, apiConfiguration: value })),
		setCustomInstructions: (value) => setState((prevState) => ({ ...prevState, customInstructions: value })),
		setAlwaysAllowReadOnly: (value) => setState((prevState) => ({ ...prevState, alwaysAllowReadOnly: value })),
		setShowAnnouncement: (value) => setState((prevState) => ({ ...prevState, shouldShowAnnouncement: value })),
	};

	return <ExtensionContext.Provider value={contextValue}>{children}</ExtensionContext.Provider>;
};

export const useExtension = () => {
	const context = useContext(ExtensionContext);
	if (context === undefined) {
		throw new Error("useExtension must be used within an ExtensionContextProvider");
	}
	return context;
};
