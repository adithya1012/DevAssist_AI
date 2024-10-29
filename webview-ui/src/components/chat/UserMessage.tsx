import { Avatar, Container } from "@mantine/core";
import MessageContainer from "./MessageContainer";

const UserMessage = ({message}:any) => {
    return (
        <MessageContainer>
            {message.content}
        </MessageContainer>
    );
}

export default UserMessage;