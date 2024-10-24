import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ApiHandler } from "../";
import { ApiHandlerOptions, ModelInfo, openAiDefaultModelId, OpenAiModelId, openAiModels } from "../../shared/api";
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

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		switch (this.getModel().id) {
			case "o1-preview":
			case "o1-mini": {
				// o1 doesnt support streaming, non-1 temp, or system prompt
				const response = await this.client.chat.completions.create({
					model: this.getModel().id,
					messages: [{ role: "user", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
				});
				yield {
					type: "text",
					text: response.choices[0]?.message.content || "",
				};
				break;
			}
			default: {
				const stream = await this.client.chat.completions.create({
					model: this.getModel().id,
					// max_completion_tokens: this.getModel().info.maxTokens,
					temperature: 0,
					messages: [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
					stream: true,
					stream_options: { include_usage: true },
				});

				for await (const chunk of stream) {
					const delta = chunk.choices[0]?.delta;
					if (delta?.content) {
						yield {
							type: "text",
							text: delta.content,
						};
					}
				}
			}
		}
	}

	getModel(): { id: OpenAiModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId;
		if (modelId && modelId in openAiModels) {
			const id = modelId as OpenAiModelId;
			return { id, info: openAiModels[id] };
		}
		return { id: openAiDefaultModelId, info: openAiModels[openAiDefaultModelId] };
	}
}
