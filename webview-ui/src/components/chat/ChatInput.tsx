import { TextInput } from "@mantine/core";
import { useState } from "react";


const ChatInput = () => {
    const [value, setValue] = useState('');

    const handleSubmit = (event:any) => {
        event.preventDefault();
        console.log(value);
        setValue('');  
    };

    return (
      <form onSubmit={handleSubmit}>
        
        <TextInput
        value={value}
        mt="md"
        onChange={(event) => setValue(event.currentTarget.value)}
        rightSectionPointerEvents="all"
        rightSection={
          <button type="submit">
              Send
            </button>
          }
          placeholder="Ask a question!"
          />
          </form>
    );
}

export default ChatInput;