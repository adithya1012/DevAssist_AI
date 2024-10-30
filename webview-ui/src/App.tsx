import React from "react";
import { useEvent } from "react-use";
import "./App.css";
import Welcome from "./components/Welcome";
import ChatLayout from "./components/chat/Layout";
// core styles are required for all packages
import "@mantine/core/styles.css";
import { createTheme, MantineProvider } from "@mantine/core";
import { ExtensionContextProvider } from "./context/ExtensionContext";

function App() {
	return (
		<MantineProvider defaultColorScheme="dark">
			<ExtensionContextProvider>
				{/* <Welcome /> */}
				<ChatLayout />
			</ExtensionContextProvider>
		</MantineProvider>
	);
}

export default App;
