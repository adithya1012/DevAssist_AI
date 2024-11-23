import { ScrollArea } from '@mantine/core';
import { useEffect, useRef } from 'react';
import ChatContainer from './ChatContainer';
import ChatInput from './ChatInput';
import { useExtension } from '../../context/ExtensionContext';
import SystemMessage from './SystemMessage';



const ChatLayout = () => {

    const {assistantMessages, showThinking} = useExtension()
    const viewport = useRef<HTMLDivElement>(null);

    const scrollToBottom = () =>
    {
        if(viewport.current){
            // console.log(viewport.current!.scrollHeight)
            viewport.current!.scrollTo({ top: viewport.current!.scrollHeight, behavior: 'smooth' });
        }
    }
  

    useEffect(()=>{
        scrollToBottom()
    },[assistantMessages])


    return (
        <div style={{padding:"5px", position:"fixed", top:0, left:0, right:0, bottom:0, display:"flex", flexDirection:"column", overflow:"hidden"}}>
            <ScrollArea style={{flexGrow:1, display:"flex", width:"100%"}} viewportRef={viewport}>
                <ChatContainer />
            </ScrollArea>
			{showThinking && <SystemMessage message={{ role: "assistant", content: "Thinking...." }} />}

            <ChatInput scrollChatViewToBottom={scrollToBottom}/>
        </div>
      );
};

export default ChatLayout;
