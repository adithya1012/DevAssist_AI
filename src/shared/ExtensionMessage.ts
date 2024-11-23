
import { ApiConfiguration, ModelInfo } from "./api"



export interface ExtensionState {

    version: string
	apiConfiguration?: ApiConfiguration
	customInstructions?: string
	alwaysAllowReadOnly?: boolean
	uriScheme?: string
	shouldShowAnnouncement: boolean
}

export interface ExtensionMessage {
    	type:
		| "action"
        action?: "chatButtonClicked" | "settingsButtonClicked" | "historyButtonClicked" | "didBecomeVisible"

    openRouterModels?: Record<string, ModelInfo>
}