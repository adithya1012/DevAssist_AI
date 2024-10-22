import { Flex, Button, Input, CloseButton} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';



const ChatLayout = () => {
    const [value, setValue] = useState('');
    return (
        <div style={{padding:"5px", position:"fixed", top:0, left:0, right:0, bottom:0, display:"flex", flexDirection:"column", overflow:"hidden"}}>
            <div>
            Header
            </div>
            <div style={{flexGrow:1, display:"flex"}}>
                chat/conversation
            </div>
            <div>
            <Input
        placeholder="Clearable input"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        rightSectionPointerEvents="all"
        mt="md"
        rightSection={
          <button style={{ display: value ? undefined : 'none' }}>
            Send
          </button>
        }
      />
            </div>
        </div>
      );
};

export default ChatLayout;
