import { TextInput } from "@mantine/core";
import { useState } from "react";
import { vscode } from "../../utils/vscode";
import { useExtension } from "../../context/ExtensionContext";

const ChatInput = () => {
	const [value, setValue] = useState("Create a python script for a simple calculator");

	const { addAssistantMessage } = useExtension();

	const handleSubmit = (event: any) => {
		event.preventDefault();
		console.log(value);
		addAssistantMessage(value);
		vscode.postMessage({
			type: "askQuestion",
			// askResponse: "messageResponse",
			text: value,
			// images,
		});
		setValue("");
	};

	return (
		<form onSubmit={handleSubmit}>
			<TextInput
				value={value}
				mt="md"
				onChange={(event) => setValue(event.currentTarget.value)}
				rightSectionPointerEvents="all"
				rightSection={<button type="submit">Send</button>}
				placeholder="Ask a question!"
			/>
		</form>
	);
};

export default ChatInput;
