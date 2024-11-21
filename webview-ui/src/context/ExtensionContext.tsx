import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useEvent } from "react-use";
import { vscode } from "../utils/vscode";
import { findLastIndex } from "../../../src/shared/array";

interface ExtensionContextType {
	showWelcome: boolean;
	showThinking: boolean;
	showToolInUse: {
		show: boolean;
		tool: string;
	};
	assistantMessages: { [key: string]: any }[];
	addAssistantMessage: (message: any) => void;
}

const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

export const ExtensionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [state, setState] = useState<{
		assistantMessages: { [key: string]: any }[];
		taskHistory: any[];
	}>({
		assistantMessages: [{ role: "assistant", content: "Hi! I am DevAssistAI. test test test test test test test test test test test test " },
			{ role: "User", content: "Hi! I am DevAssistAI. test test test test test test test test test test test test " }
		],
		taskHistory: [],
	});

	const [showWelcome, setShowWelcome] = useState(false);
	const [showThinking, setShowThinking] = useState(false);
	const [showToolInUse, setShowToolInUse] = useState({
		show: false,
		tool: "",
	});

	const handleMessage = useCallback((event: MessageEvent) => {
		const message: any = event.data;
		// console.log("message", message);
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
		console.log("Extension context provider mounted with webviewDidLaunch");
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
		addAssistantMessage,
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
