import React, { useState, useCallback, useEffect } from "react";
import "./App.css";
import ChatLayout from "./components/chat/Layout";
import APIOptions from "./components/settings/APIoptions"; 
import "@mantine/core/styles.css";
import { MantineProvider, Button, Stack } from "@mantine/core";
import { ExtensionContextProvider, useExtension } from "./context/ExtensionContext";
import SettingsView from "./components/settings/SettingsView";
import { useEvent } from "react-use";
import { ExtensionMessage } from "../../src/shared/ExtensionMessage";

function AppContent() {
    const [showApiOptions, setShowApiOptions] = useState(true); // Start with APIOptions
    const [showSettings, setShowSettings] = useState(true); 
    const { 
        newTask, 
        setNewTask, 
        clearAssistantMessages 
    } = useExtension();
    const showModelOptions = true; 

    const handleMessage = useCallback((e: MessageEvent) => {
        const message: ExtensionMessage = e.data
        
        switch (message.type) {
            case "action":
                switch (message.action!) {
                    case "settingsButtonClicked":
                        setShowSettings(true)
                        setNewTask(false); // Reset newTask when opening settings
                        break
                    case "chatButtonClicked":
                        console.log("message", message.action);
                        setShowSettings(false)
                        setNewTask(true); // Set newTask to true when opening chat
                        clearAssistantMessages(); // Clear assistant messages
                        break
                }
                break
        }
    }, [setNewTask, clearAssistantMessages])

    useEvent("message", handleMessage);

    // Handler to toggle back to ChatLayout
    const handleDoneClick = () => {
        setShowApiOptions(false);
        setShowSettings(false);
        setNewTask(true); // Ensure newTask is set to true after closing settings
    };

    return (
        <>
            {/* Render SettingsView independently when showSettings is true */}
            {showSettings && (<SettingsView onDone={() => setShowSettings(false)} />
)}

            {/* Show APIOptions if showApiOptions is true and settings are not shown */}
            {showApiOptions && !showSettings && (
                <Stack align="center" justify="center" >
                        {showSettings && (<SettingsView onDone={() => setShowSettings(false)} />)}
                        <ChatLayout />
                </Stack>
            )}

        </>
    );
}

function App() {
    return (
        <MantineProvider defaultColorScheme="dark">
            <ExtensionContextProvider>
                <AppContent />
            </ExtensionContextProvider>
        </MantineProvider>
    );
}

export default App;