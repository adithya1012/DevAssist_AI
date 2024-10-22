import React from "react";
import logo from "./logo.svg";
import "./App.css";
import Welcome from "./components/Welcome";
import ChatLayout from "./components/chat/Layout";
// core styles are required for all packages
import '@mantine/core/styles.css';
import { createTheme, MantineProvider } from '@mantine/core';

function App() {
	return (
		<MantineProvider defaultColorScheme="dark">

		<div >
			{/* <Welcome /> */}
			<ChatLayout />
		</div>
		</MantineProvider>
	);
}

export default App;
