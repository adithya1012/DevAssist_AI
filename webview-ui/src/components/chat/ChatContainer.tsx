import { useExtension } from "../../context/ExtensionContext";
import SystemMessage from "./SystemMessage";
import UserMessage from "./UserMessage";

const ChatContainer = () => {
	const { showThinking, showToolInUse, assistantMessages } = useExtension();
	console.log(assistantMessages);
	return (
		// generate the chat container using the system message and user message components
		<div style={{ width: "100%" }}>
			{assistantMessages.map((message, index) => {
				if (message.role === "assistant") {
					return <SystemMessage key={index} message={message} />;
				} else {
					return <UserMessage key={index} message={message} />;
				}
			})}
			{/* {showThinking && <SystemMessage message={{ role: "assistant", content: "Thinking...." }} />} */}

			{/* {showToolInUse.show && <SystemMessage message={{ type: "system", message: `${showToolInUse.tool}` }} />} */}
		</div>
	);
};

export default ChatContainer;
