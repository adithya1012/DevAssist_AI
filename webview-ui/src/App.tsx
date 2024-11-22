import React, { useState, useCallback, useEffect } from "react";
import "./App.css";
import ChatLayout from "./components/chat/Layout";
import APIOptions from "./components/settings/APIoptions"; 
import "@mantine/core/styles.css";
import { MantineProvider, Button, Stack } from "@mantine/core";
import { ExtensionContextProvider } from "./context/ExtensionContext";
import SettingsView from "./components/settings/SettingsView";
import { useEvent } from "react-use";
import { ExtensionMessage } from "../../src/shared/ExtensionMessage";

function App() {
    const [showApiOptions, setShowApiOptions] = useState(true); // Start with APIOptions
    const [showSettings, setShowSettings] = useState(false); 
    const showModelOptions = true; 

    // Handle message for showing settings or extension open
    const handleMessage = useCallback((e: MessageEvent) => {
        const message: ExtensionMessage = e.data;
        
        // When settings gear is clicked, show settings
        if (message.type === "action" && message.action === "settingsButtonClicked") {
            setShowApiOptions(true);
            setShowSettings(false);
        }
    }, []);

    useEvent("message", handleMessage);

    // Handler to toggle back to ChatLayout
    const handleDoneClick = () => {
        setShowApiOptions(false);
        setShowSettings(false);
    };

    return (
        <MantineProvider defaultColorScheme="dark">
            <ExtensionContextProvider>
                {/* Render SettingsView independently when showSettings is true */}
                {showSettings && (
                    <SettingsView onDone={handleDoneClick} />
                )}

                {/* Show APIOptions or ChatLayout based on state */}
                {showApiOptions ? (
                    <Stack align="center" justify="center" >
                        <APIOptions showModelOptions={showModelOptions} />
                        <Button onClick={handleDoneClick}>Done</Button>
                    </Stack>
                ) : (
                    <ChatLayout />
                )}
            </ExtensionContextProvider>
        </MantineProvider>
    );
}

export default App;