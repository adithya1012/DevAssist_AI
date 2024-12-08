import React from "react";
import { Avatar, Box } from "@mantine/core";

const MessageContainer = ({ children, isSystemMessage }: any) => {
  return (
    <div>
      {/* Avatar and Name */}
      <div
        className={`avatar-container ${
          isSystemMessage ? "system" : "user"
        }`}
      >
        <Avatar
          radius="xl"
          size="sm"
          color={isSystemMessage ? "blue" : "gray"}
        />
        <Box style={{ fontWeight: "bold", fontSize: "0.85rem" }}>
          {isSystemMessage ? "DevAssist" : "User"}
        </Box>
      </div>
      {/* Message Bubble */}
      <div
        className={`message-bubble ${isSystemMessage ? "system" : "user"}`}
      >
        {children}
      </div>
    </div>
  );
};

export default MessageContainer;