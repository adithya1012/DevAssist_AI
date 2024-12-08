import { ActionIcon, Textarea } from "@mantine/core";
import { useState } from "react";
import { vscode } from "../../utils/vscode";
import { useExtension } from "../../context/ExtensionContext";

const ChatInput = ({ scrollChatViewToBottom, ...props }: any) => {
	const [newTask, setNewTask] = useState(true);
	const [value, setValue] = useState(
		"Give me a simple flask application which can work as a calculator. create a simple User interface to it. And deploy the application."
	);

	const { apiConfiguration, addAssistantMessage } = useExtension();

	const handleSubmit = (event: any) => {
		event.preventDefault();

		// Determine the API key based on the selected provider
		let apiKey = "";
		switch (apiConfiguration?.apiProvider) {
			case "gemini":
				apiKey = apiConfiguration?.geminiApiKey || "";
				break;
			case "openai-native":
				apiKey = apiConfiguration?.openAiApiKey || "";
				break;
			// Add other providers as needed
			default:
				apiKey = apiConfiguration?.openAiApiKey || "";
		}

		// console.log("Sending message with API key for provider:", apiConfiguration?.apiProvider);
		// Add message to chat
		addAssistantMessage(value);

		// Post message to backend with API key and other configuration
		vscode.postMessage({
			type: "askQuestion",
			text: value,
			apiProvider: apiConfiguration?.apiProvider,
			apiKey: apiKey,
			newTask: newTask,
			modelId: apiConfiguration?.apiModelId, // Include selected model ID
		});
		setValue("");
		setNewTask(false);
	};

	return (
		<form onSubmit={handleSubmit}>
			<Textarea
				value={value}
				mt="md"
				onChange={(event) => setValue(event.currentTarget.value)}
				rightSectionPointerEvents="all"
				rightSection={
					<ActionIcon variant="transparent" color="gray" aria-label="Settings" type="submit">
						<span className="codicon codicon-send"></span>
					</ActionIcon>
				}
				placeholder="Ask a question!"
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						handleSubmit(e);
					}
				}}
			/>
		</form>
	);
};

export default ChatInput;
