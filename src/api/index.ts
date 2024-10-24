import Anthropic from "@anthropic-ai/sdk";
import { ApiConfiguration, ModelInfo } from "../shared/api";
import { ApiStream } from "./transform/stream";
import { OpenAiHandler } from "./providers/openai";
import { AnthropicHandler } from "./providers/anthropic";
import { GeminiHandler } from "./providers/gemini";
import { OllamaHandler } from "./providers/ollama";

export interface ApiHandler {
	createMessage(prompt: string, message: Anthropic.Messages.MessageParam[]): ApiStream;
	getModel(): { id: string; info: ModelInfo };
}

export function createApiHandler(config: ApiConfiguration): ApiHandler {
	const { apiProvider, ...options } = config;

	switch (apiProvider) {
		case "anthropic":
			return new AnthropicHandler(options);
		case "openai":
			return new OpenAiHandler(options);
		case "gemini":
			return new GeminiHandler(options);
		case "ollama":
			return new OllamaHandler(options);
		default:
			return new OpenAiHandler(options);
	}
}
