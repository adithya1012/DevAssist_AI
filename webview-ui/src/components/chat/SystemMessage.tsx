import { Avatar, Container } from "@mantine/core";
import MessageContainer from "./MessageContainer";

const SystemMessage = () => {
    return (
        <MessageContainer isSystemMessage>
            System Message
        </MessageContainer>
    );
}

export default SystemMessage;