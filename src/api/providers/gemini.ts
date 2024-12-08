import { Anthropic } from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiHandler } from "../";
import { ApiHandlerOptions, geminiDefaultModelId, GeminiModelId, geminiModels, ModelInfo } from "../../shared/api";
import { convertAnthropicMessageToGemini } from "../transform/gemini-format";
import { ApiStream } from "../transform/stream";

export class GeminiHandler implements ApiHandler {
	private options: ApiHandlerOptions;
	private client: GoogleGenerativeAI;

	constructor(options: ApiHandlerOptions) {
		if (!options.geminiApiKey) {
			throw new Error("API key is required for Google Gemini");
		}
		this.options = options;

		// console.log("Received API Key:", options.geminiApiKey);

		this.client = new GoogleGenerativeAI(options.geminiApiKey);
	}

	async createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): Promise<any> {
		const model = this.client.getGenerativeModel({
			model: this.getModel().id,
			systemInstruction: systemPrompt,
		});
		const result = await model.generateContent({
			contents: messages.map(convertAnthropicMessageToGemini),
			generationConfig: {
				// maxOutputTokens: this.getModel().info.maxTokens,
				temperature: 0,
			},
		});
		if (result.response.candidates && result.response.candidates.length > 0) {
			return { content: result.response.candidates[0].content.parts[0].text };
		} else {
			return {
				content: "No response from Gemini",
			};
		}
		// for await (const chunk of result.stream) {
		// 	yield {
		// 		type: "text",
		// 		text: chunk.text(),
		// 	};
		// }
	}

	getModel(): { id: GeminiModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId;
		if (modelId && modelId in geminiModels) {
			const id = modelId as GeminiModelId;
			return { id, info: geminiModels[id] };
		}
		return { id: geminiDefaultModelId, info: geminiModels[geminiDefaultModelId] };
	}
}
