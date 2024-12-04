import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ApiHandler } from "../";
import {
	ApiHandlerOptions,
	ModelInfo,
	openAiNativeDefaultModelId,
	OpenAiNativeModelId,
	openAiNativeModels,
} from "../../shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { ApiStream } from "../transform/stream";

export class OpenAiHandler implements ApiHandler {
	private options: ApiHandlerOptions;
	private client: OpenAI;

	constructor(options: ApiHandlerOptions) {
		this.options = options;
		this.client = new OpenAI({
			apiKey: this.options.openAiApiKey,
		});
	}

	async createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): Promise<any> {
		switch (this.getModel().id) {
			case "o1-preview":
			case "o1-mini": {
				const response = await this.client.chat.completions.create({
					model: this.getModel().id,
					messages: [{ role: "user", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
				});
				return response.choices[0];
			}
			default: {
				const response = await this.client.chat.completions.create({
					model: this.getModel().id,
					temperature: 0,
					seed: 42,
					messages: [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
					stream: false,
				});
				return response.choices[0]?.message;
			}
		}
	}

	getModel(): { id: OpenAiNativeModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId;
		if (modelId && modelId in openAiNativeModels) {
			const id = modelId as OpenAiNativeModelId;
			return { id, info: openAiNativeModels[id] };
		}
		return { id: openAiNativeDefaultModelId, info: openAiNativeModels[openAiNativeDefaultModelId] };
	}
}
