import { ActionIcon, Textarea } from "@mantine/core";
import { useState } from "react";
import { vscode } from "../../utils/vscode";
import { useExtension } from "../../context/ExtensionContext";

const ChatInput = ({scrollChatViewToBottom, ...props}: any) => {
    const [value, setValue] = useState("Create a python script for a simple calculator");

    const { apiConfiguration, addAssistantMessage } = useExtension();

    const handleSubmit = (event: any) => {
        event.preventDefault();
        
        // Determine the API key based on the selected provider
        let apiKey = "";
        switch(apiConfiguration?.apiProvider) {
            case "gemini":
                apiKey = apiConfiguration?.geminiApiKey || "";
                break;
            case "openai-native":
                apiKey = apiConfiguration?.openAiNativeApiKey || "";
                break;
            // Add other providers as needed
            default:
                apiKey = "";
        }

        // console.log("Sending message with API key for provider:", apiConfiguration?.apiProvider);
            // Add message to chat
            addAssistantMessage(value);

        // Post message to backend with API key and other configuration
        vscode.postMessage({
            type: "askQuestion",
            text: value,
            apiProvider: apiConfiguration?.apiProvider,
            apiKey: apiKey,
            // apiKey:"AIzaSyDQZf0D36OtQewM0Rt6colKAnFAHll3Qs0",
            modelId: apiConfiguration?.apiModelId // Include selected model ID
        });

    
        
        // Clear input
        setValue("");
    };

    return (
        <form onSubmit={handleSubmit}>
            <Textarea
                value={value}
                mt="md"
                onChange={(event) => setValue(event.currentTarget.value)}
                rightSectionPointerEvents="all"
                rightSection={
                    <ActionIcon 
                        variant="transparent" 
                        color="gray" 
                        aria-label="Settings" 
                        type="submit"
                    >
                        <span className="codicon codicon-send"></span>
                    </ActionIcon>
                }
                placeholder="Ask a question!"
                onKeyDown={(e)=>{
                    if(e.key === "Enter" && !e.shiftKey){
                        handleSubmit(e)
                    }
                }}
            />
        </form>
    );
};

export default ChatInput;