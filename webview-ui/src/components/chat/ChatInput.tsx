import { ActionIcon, Textarea } from "@mantine/core";
import { useState } from "react";
import { vscode } from "../../utils/vscode";
import { useExtension } from "../../context/ExtensionContext";

const ChatInput = ({scrollChatViewToBottom, ...props}: any) => {
	const [newTask, setNewTask] = useState(true);
	const [value, setValue] = useState("Create a python script for a simple calculator");

	const { addAssistantMessage } = useExtension();

	const handleSubmit = (event: any) => {
		event.preventDefault();
		console.log(value);
		addAssistantMessage(value);
		vscode.postMessage({
			type: "askQuestion",
			// askResponse: "messageResponse",
			newTask: newTask,
			text: value,
			// images,
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
				rightSection={<ActionIcon variant="transparent" color="gray" aria-label="Settings" type="submit">
					<span
					className="codicon codicon-send"
					>
					</span>
				  </ActionIcon>}
				placeholder="Ask a question!"
				onKeyDown={(e)=>{
					if(e.key === "Enter" && !e.shiftKey){
						handleSubmit(e)
					}
				}}
			/>
		</form>
	);
};

export default ChatInput;
