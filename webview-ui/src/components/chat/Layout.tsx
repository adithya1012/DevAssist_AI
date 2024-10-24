import Header from '../Header';
import ChatContainer from './ChatContainer';
import ChatInput from './ChatInput';



const ChatLayout = () => {
    return (
        <div style={{padding:"5px", position:"fixed", top:0, left:0, right:0, bottom:0, display:"flex", flexDirection:"column", overflow:"hidden"}}>
            <Header />
            <div style={{flexGrow:1, display:"flex", width:"100%"}}>
                <ChatContainer />
            </div>
            <ChatInput />
        </div>
      );
};

export default ChatLayout;
