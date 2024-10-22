export type ApiProvider = "ollama" | "openai" | "gemini" | "anthropic";

export interface ModelInfo {
	maxTokens?: number;
	contextWindow?: number;
	description?: string;
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
}

export type ApiConfiguration = ApiHandlerOptions & {
	apiProvider?: ApiProvider;
};

export const openAiModelInfoDefaults: ModelInfo = {
	maxTokens: -1,
	contextWindow: 128_000,
};

// Anthropic
// https://docs.anthropic.com/en/docs/about-claude/models
export type AnthropicModelId = keyof typeof anthropicModels;
export const anthropicDefaultModelId: AnthropicModelId = "claude-3-5-sonnet-20240620";
export const anthropicModels = {
	"claude-3-5-sonnet-20240620": {
		maxTokens: 8192,
		contextWindow: 200_000,
	},
	"claude-3-opus-20240229": {
		maxTokens: 4096,
		contextWindow: 200_000,
	},
	"claude-3-haiku-20240307": {
		maxTokens: 4096,
		contextWindow: 200_000,
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
	},
	"gemini-1.5-flash-exp-0827": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
	},
	"gemini-1.5-flash-8b-exp-0827": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
	},
	"gemini-1.5-pro-002": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
	},
	"gemini-1.5-pro-exp-0827": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
	},
} as const satisfies Record<string, ModelInfo>;

// OpenAI
// https://openai.com/api/pricing/
export type OpenAiModelId = keyof typeof openAiModels;
export const openAiDefaultModelId: OpenAiModelId = "gpt-4o";
export const openAiModels = {
	// don't support tool use yet
	"o1-preview": {
		maxTokens: 32_768,
		contextWindow: 128_000,
	},
	"o1-mini": {
		maxTokens: 65_536,
		contextWindow: 128_000,
	},
	"gpt-4o": {
		maxTokens: 4_096,
		contextWindow: 128_000,
	},
	"gpt-4o-mini": {
		maxTokens: 16_384,
		contextWindow: 128_000,
	},
} as const satisfies Record<string, ModelInfo>;
