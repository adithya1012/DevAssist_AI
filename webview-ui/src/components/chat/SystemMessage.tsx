import React from "react";
import { Button, Code } from "@mantine/core";
import MessageContainer from "./MessageContainer";

const SystemMessage = ({ message }: any) => {
  return (
    <MessageContainer isSystemMessage={true}>
      {message.content}
      {message.action &&
        message.action.map((action: any, index: number) => (
          <div key={index} style={{ marginTop: "10px" }}>
            <pre style={{ margin: 0 }}>
              <Code block>{action.command}</Code>
            </pre>
            <Button size="xs" variant="outline" mt="xs">
              {action.label}
            </Button>
          </div>
        ))}
    </MessageContainer>
  );
};

export default SystemMessage;
