import React from "react";
import MessageContainer from "./MessageContainer";

const UserMessage = ({ message }: any) => {
  return (
    <MessageContainer isSystemMessage={false}>
      {message.content}
    </MessageContainer>
  );
};

export default UserMessage;
