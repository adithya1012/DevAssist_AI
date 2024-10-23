import SystemMessage from "./SystemMessage"
import UserMessage from "./UserMessage"

const ChatContainer = () => {
    return (
        // generate the chat container using the system message and user message components
        <div>
        <SystemMessage />
        <UserMessage />
        </div>
    );
}

export default ChatContainer;