export type ApiProvider = "ollama" | "openai-native" | "gemini" | "anthropic" | "openai" | "openrouter";

export interface ModelInfo {
	maxTokens?: number;
	contextWindow?: number;
	description?: string;
	supportsImages?: boolean;
	supportsPromptCache: boolean;
	supportsComputerUse?: boolean;
}

export interface ApiHandlerOptions {
	apiModelId?: string;
	apiKey?: string; // openai
	anthropicBaseUrl?: string;
	openAiBaseUrl?: string;
	openAiApiKey?: string;
	openAiModelId?: string;
	ollamaModelId?: string;
	ollamaBaseUrl?: string;
	geminiApiKey?: string;
	openAiNativeApiKey?: string;
}

export type ApiConfiguration = ApiHandlerOptions & {
	apiProvider?: ApiProvider;
};

// export const openAiModelInfoDefaults: ModelInfo = {
// 	maxTokens: -1,
// 	contextWindow: 128_000,
// };

// Anthropic
// https://docs.anthropic.com/en/docs/about-claude/models
export type AnthropicModelId = keyof typeof anthropicModels;
export const anthropicDefaultModelId: AnthropicModelId = "claude-3-5-sonnet-20240620";
export const anthropicModels = {
	"claude-3-5-sonnet-20240620": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsComputerUse: true,
		supportsPromptCache: true,
	},
	"claude-3-opus-20240229": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
	},
	"claude-3-haiku-20240307": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
	},
} as const satisfies Record<string, ModelInfo>; // as const assertion makes the object deeply readonly

// Gemini
// https://ai.google.dev/gemini-api/docs/models/gemini
export type GeminiModelId = keyof typeof geminiModels;
export const geminiDefaultModelId: GeminiModelId = "gemini-1.5-flash-002";
export const geminiModels = {
"gemini-1.5-flash-002": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
	},
	"gemini-1.5-flash-exp-0827": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
	},
	"gemini-1.5-flash-8b-exp-0827": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
	},
	"gemini-1.5-pro-002": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
		supportsImages: true,
		supportsPromptCache: false,
	},
	"gemini-1.5-pro-exp-0827": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
		supportsImages: true,
		supportsPromptCache: false,
	},
} as const satisfies Record<string, ModelInfo>;

export const openAiModelInfoSaneDefaults: ModelInfo = {
	maxTokens: -1,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
}
// OpenAI
// https://openai.com/api/pricing/
export type OpenAiNativeModelId = keyof typeof openAiNativeModels;
export const openAiNativeDefaultModelId: OpenAiNativeModelId = "gpt-4o";
export const openAiNativeModels = {
	// don't support tool use yet
"o1-preview": {
		maxTokens: 32_768,
		contextWindow: 128_000,
		supportsImages: true,
		supportsPromptCache: false,
	},
	"o1-mini": {
		maxTokens: 65_536,
		contextWindow: 128_000,
		supportsImages: true,
		supportsPromptCache: false,
	},
	"gpt-4o": {
		maxTokens: 4_096,
		contextWindow: 128_000,
		supportsImages: true,
		supportsPromptCache: false,
	},
	"gpt-4o-mini": {
		maxTokens: 16_384,
		contextWindow: 128_000,
		supportsImages: true,
		supportsPromptCache: false,
	},
} as const satisfies Record<string, ModelInfo>;
