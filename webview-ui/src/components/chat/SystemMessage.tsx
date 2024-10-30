import { Avatar, Container } from "@mantine/core";
import MessageContainer from "./MessageContainer";

const SystemMessage = ({message}:any) => {

    return (
        <MessageContainer isSystemMessage>
            {message.content}

            {
                message.action && message.action.map((action:any, index:number) => {
                    return (
                        <div>
                            <pre>
                                <code>{action.command}</code>
                            </pre>
                        <button key={index}>
                            {action.label}
                        </button>
                        </div>
                    )
                })
            }
        </MessageContainer>
    );
}

export default SystemMessage;