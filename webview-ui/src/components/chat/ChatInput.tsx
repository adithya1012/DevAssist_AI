import { TextInput } from "@mantine/core";
import { useState } from "react";


const ChatInput = () => {
    const [value, setValue] = useState('');

    return (
        <TextInput
        value={value}
        mt="md"
        onChange={(event) => setValue(event.currentTarget.value)}
        rightSectionPointerEvents="all"
        rightSection={
            <button >
              Send
            </button>
          }
        placeholder="Ask a question!"
      />
    );
}

export default ChatInput;