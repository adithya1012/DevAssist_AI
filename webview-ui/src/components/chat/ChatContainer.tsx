import SystemMessage from "./SystemMessage"
import UserMessage from "./UserMessage"


const demoChat = [
    {
        type: "system",
        message: "Welcome to the chat!"
    },
    {
        type: "user",
        message: "Hello!"
    },
    {
        type: "system",
        message: "How can I help you today?"
    },
    {
        type: "user",
        message: "I have a question about my order."
    },
    {
        type: "system",
        message: "Sure! What is your order number?"
    },
    {
        type: "user",
        message: "12345"
    },
    {
        type: "system",
        message: "Thank you! One moment please."
    },
    {
        type: "system",
        message: "I found your order. It is currently being processed and will be shipped soon.",
        action: [
            {
                type: "run_in_terminal",
                label: "Run In Terminal",
                command:"echo 'Hello World'",
                action: "run_in_terminal"
            }
        ]
    },
    {
        type: "user",
        message: "Thank you!"
    }
]


const ChatContainer = () => {

    return (
        // generate the chat container using the system message and user message components
        <div style={{width:"100%"}}>
            {demoChat.map((message, index) => {
                if (message.type === "system") {
                    return <SystemMessage key={index} message={message} />
                } else {
                    return <UserMessage key={index} message={message} />
                }
            })}
        </div>
    );
}

export default ChatContainer;