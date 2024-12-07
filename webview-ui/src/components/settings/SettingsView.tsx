import { VSCodeButton, VSCodeCheckbox, VSCodeLink, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react"
import { memo, useEffect, useState } from "react"
import { useExtension } from "../../context/ExtensionContext"
import { vscode } from "../../utils/vscode"
import ApiOptions from "./APIoptions"

const IS_DEV = false

type SettingsViewProps = {
	onDone: () => void // Add this prop type
}

const SettingsView = ({ onDone }: SettingsViewProps) => {
	const {
		apiConfiguration,
		version,
		customInstructions,
		setCustomInstructions,
		alwaysAllowReadOnly,
		setAlwaysAllowReadOnly,
	} = useExtension()
	const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined)
	const [modelIdErrorMessage, setModelIdErrorMessage] = useState<string | undefined>(undefined)

	const handleSubmit = () => {
		// Perform any necessary validation or state updates
		// Then call onDone to close the settings view
		
		// Commented out validation for now
		// const apiValidationResult = validateApiConfiguration(apiConfiguration)
		// const modelIdValidationResult = validateModelId(apiConfiguration, openRouterModels)

		// if (!apiValidationResult && !modelIdValidationResult) {
		// 	vscode.postMessage({ type: "apiConfiguration", apiConfiguration })
		// 	vscode.postMessage({ type: "customInstructions", text: customInstructions })
		// 	vscode.postMessage({ type: "alwaysAllowReadOnly", bool: alwaysAllowReadOnly })
		onDone(); // Call the onDone callback to close the settings
		// }
	}

	useEffect(() => {
		setApiErrorMessage(undefined)
		setModelIdErrorMessage(undefined)
	}, [apiConfiguration])

	const handleResetState = () => {
		vscode.postMessage({ type: "resetState" })
	}

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				padding: "10px 0px 0px 20px",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "17px",
					paddingRight: 17,
				}}>
				<h3 style={{ color: "var(--vscode-foreground)", margin: 0 }}>Settings</h3>
				<VSCodeButton onClick={handleSubmit}>Done</VSCodeButton>
			</div>
			<div
				style={{ flexGrow: 1, overflowY: "scroll", paddingRight: 8, display: "flex", flexDirection: "column" }}>
				<div style={{ marginBottom: 5 }}>
					<ApiOptions
						showModelOptions={true}
						apiErrorMessage={apiErrorMessage}
						modelIdErrorMessage={modelIdErrorMessage}
					/>
				</div>
			</div>
		</div>
	)
}

export default memo(SettingsView)