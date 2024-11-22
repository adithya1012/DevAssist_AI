import React, { useCallback, useEffect, useState,memo ,useMemo,Fragment} from "react";
import {
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
  VSCodeButton,
  VSCodeLink,
} from "@vscode/webview-ui-toolkit/react";
import { useInterval } from "react-use";
import { vscode } from "../../utils/vscode";
import { useExtension } from "../../context/ExtensionContext";
import {
	ApiConfiguration,
	ModelInfo,
	geminiModels,
	geminiDefaultModelId,
	openAiNativeDefaultModelId,
	openAiNativeModels,
	openAiModelInfoSaneDefaults



} from "../../../../src/shared/api"

// Define component props interface
interface ApiOptionsProps {
  showModelOptions: boolean;
  apiErrorMessage?: string;
  modelIdErrorMessage?: string;
}

const ApiOptions: React.FC<ApiOptionsProps> = ({
  showModelOptions,
  apiErrorMessage,
  modelIdErrorMessage,
}) => {
  // Extract API configuration from context
  const { apiConfiguration, setApiConfiguration } = useExtension();

  // Local state for storing available models
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const { selectedProvider, selectedModelId, selectedModelInfo } = useMemo(() => {
		return normalizeApiConfiguration(apiConfiguration)
	}, [apiConfiguration])

  // Handle provider change and update available models
	const handleInputChange = (field: keyof ApiConfiguration) => (event: any) => {
		setApiConfiguration({ ...apiConfiguration, [field]: event.target.value })
	}

  // Fetch models periodically if using specific providers (mocked here)
  useInterval(() => {
    if (selectedProvider === "openai") {
      vscode.postMessage({ type: "requestOpenAiModels" });
    }
  }, selectedProvider === "openai" ? 5000 : null);

  // Listening for messages from the extension to update model options dynamically
  const handleMessage = useCallback((event: MessageEvent) => {
    const { type, models } = event.data;
    if (type === "openAiModels" && models) {
      setAvailableModels(models);
    }
  }, []);
  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  const createDropdown = (models: Record<string, ModelInfo>) => {
	return (
		<VSCodeDropdown
			id="model-id"
			value={selectedModelId}
			onChange={handleInputChange("apiModelId")}
			style={{ width: "100%" }}>
			<VSCodeOption value="">Select a model...</VSCodeOption>
			{Object.keys(models).map((modelId) => (
				<VSCodeOption
					key={modelId}
					value={modelId}
					style={{
						whiteSpace: "normal",
						wordWrap: "break-word",
						maxWidth: "100%",
					}}>
					{modelId}
				</VSCodeOption>
			))}
		</VSCodeDropdown>
	)
}

  // Render the component
  return (
    <div className="api-options-container" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <h2 style={{ margin: 0 }}>Settings</h2>
    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label htmlFor="api-provider">
        <span style={{ fontWeight: 500 }}>API Provider</span>
      </label>
      <VSCodeDropdown
        value={selectedProvider}
        onChange={handleInputChange("apiProvider")}
		style={{ marginBottom: "0.5em" }} 
      >
 			
					<VSCodeOption value="gemini">Google Gemini</VSCodeOption>
					<VSCodeOption value="openai-native">OpenAI</VSCodeOption>
      </VSCodeDropdown>
    </div>


    {selectedProvider === "gemini" && (
				<div>
					<VSCodeTextField
						value={apiConfiguration?.geminiApiKey || ""}
						style={{ width: "100%" }}
						type="password"
						onInput={handleInputChange("geminiApiKey")}
						placeholder="Enter API Key...">
						<label>
						<span style={{ fontWeight: 500 }}>Gemini API Key</span>
						</label>						
					</VSCodeTextField>
					<p
						style={{
							fontSize: "12px",
							marginTop: 3,
							color: "var(--vscode-descriptionForeground)",
						}}>
						This key is stored locally and only used to make API requests from this extension.
						{!apiConfiguration?.geminiApiKey && (
							<VSCodeLink
								href="https://ai.google.dev/"
								style={{ display: "inline", fontSize: "inherit" }}>
								You can get a Gemini API key by signing up here.
							</VSCodeLink>
						)}
					</p>
				</div>
			)}

		{selectedProvider === "openai-native" && (
				<div>
					<VSCodeTextField
						value={apiConfiguration?.openAiNativeApiKey || ""}
						style={{ width: "100%" }}
						type="password"
						onInput={handleInputChange("openAiNativeApiKey")}
						placeholder="Enter API Key...">
						<label>
						<span style={{ fontWeight: 500 }}>OpenAI API Key</span>
						</label>
						
					</VSCodeTextField>
					<p
						style={{
							fontSize: "12px",
							marginTop: 3,
							color: "var(--vscode-descriptionForeground)",
						}}>
						This key is stored locally and only used to make API requests from this extension.
						{!apiConfiguration?.openAiNativeApiKey && (
							<VSCodeLink
								href="https://platform.openai.com/api-keys"
								style={{ display: "inline", fontSize: "inherit" }}>
								You can get an OpenAI API key by signing up here.
							</VSCodeLink>
						)}
					</p>
				</div>
			)}

		{selectedProvider !== "openrouter" &&
				selectedProvider !== "openai" &&
				selectedProvider !== "ollama" &&
				showModelOptions && (
					<>
						<div className="dropdown-container">
							<label htmlFor="model-id">
								<span style={{ fontWeight: 500 }}>Model</span>
							</label>
						
							{selectedProvider === "gemini" && createDropdown(geminiModels)}
							{selectedProvider === "openai-native" && createDropdown(openAiNativeModels)}
						</div>

						<ModelInfoView
							selectedModelId={selectedModelId}
							modelInfo={selectedModelInfo}
						/>
					</>
				)}

 
    </div>
  );
};

export const ModelInfoView = ({
	selectedModelId,
	modelInfo,
}: {
	selectedModelId: string
	modelInfo: ModelInfo
}) => {
	const isGemini = Object.keys(geminiModels).includes(selectedModelId)

	const infoItems = [
		modelInfo.maxTokens !== undefined && modelInfo.maxTokens > 0 && (
			<span key="maxTokens">
				<span style={{ fontWeight: 500 }}>Max output:</span> {modelInfo.maxTokens?.toLocaleString()} tokens
			</span>
		),
		isGemini && (
			<span key="geminiInfo" style={{ fontStyle: "italic" }}>
				* Free up to {selectedModelId && selectedModelId.includes("flash") ? "15" : "2"} requests per minute.
				After that, billing depends on prompt size.{" "}
				<VSCodeLink href="https://ai.google.dev/pricing" style={{ display: "inline", fontSize: "inherit" }}>
					For more info, see pricing details.
				</VSCodeLink>
			</span>
		),
	].filter(Boolean)

	return (
		<p style={{ fontSize: "12px", marginTop: "2px", color: "var(--vscode-descriptionForeground)" }}>
			{infoItems.map((item, index) => (
				<Fragment key={index}>
					{item}
					{index < infoItems.length - 1 && <br />}
				</Fragment>
			))}
		</p>
	)
}

export function normalizeApiConfiguration(apiConfiguration?: ApiConfiguration) {
	const provider = apiConfiguration?.apiProvider || "openai-native"
	const modelId = apiConfiguration?.apiModelId

	const getProviderData = (models: Record<string, ModelInfo>, defaultId: string) => {
		let selectedModelId: string
		let selectedModelInfo: ModelInfo
		if (modelId && modelId in models) {
			selectedModelId = modelId
			selectedModelInfo = models[modelId]
		} else {
			selectedModelId = defaultId
			selectedModelInfo = models[defaultId]
		}
		return { selectedProvider: provider, selectedModelId, selectedModelInfo }
	}
	switch (provider) {

		case "gemini":
			return getProviderData(geminiModels, geminiDefaultModelId)
		case "openai-native":
			return getProviderData(openAiNativeModels, openAiNativeDefaultModelId)

		case "openai":
			return {
				selectedProvider: provider,
				selectedModelId: apiConfiguration?.openAiModelId || "",
				selectedModelInfo: openAiModelInfoSaneDefaults,
			}
		case "ollama":
			return {
				selectedProvider: provider,
				selectedModelId: apiConfiguration?.ollamaModelId || "",
				selectedModelInfo: openAiModelInfoSaneDefaults,
			}

		default:
			return getProviderData(openAiNativeModels, openAiNativeDefaultModelId)
	}
}



export default ApiOptions;
