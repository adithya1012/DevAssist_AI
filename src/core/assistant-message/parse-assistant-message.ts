import {
	AssistantMessageContent,
	TextContent,
	ToolUse,
	ToolParamName,
	toolParamNames,
	toolUseNames,
	ToolUseName,
} from ".";

export function parseAssistantMessage(assistantMessage: string) {
	let contentBlocks: AssistantMessageContent[] = [];
	let currentTextContent: TextContent | undefined = undefined;
	let currentTextContentStartIndex = 0;
	let currentToolUse: ToolUse | undefined = undefined;
	let currentToolUseStartIndex = 0;
	let currentParamName: ToolParamName | undefined = undefined;
	let currentParamValueStartIndex = 0;
	let accumulator = "";

	for (let i = 0; i < assistantMessage.length; i++) {
		const char = assistantMessage[i];
		accumulator += char;

		// there should not be a param without a tool use
		if (currentToolUse && currentParamName) {
			const currentParamValue = accumulator.slice(currentParamValueStartIndex);
			const paramClosingTag = `</${currentParamName}>`;
			if (currentParamValue.endsWith(paramClosingTag)) {
				// end of param value
				currentToolUse.params[currentParamName] = currentParamValue.slice(0, -paramClosingTag.length).trim();
				currentParamName = undefined;
				continue;
			} else {
				// partial param value is accumulating
				continue;
			}
		}

		if (currentToolUse) {
			const currentToolValue = accumulator.slice(currentToolUseStartIndex);
			const toolUseClosingTag = `</${currentToolUse.name}>`;
			if (currentToolValue.endsWith(toolUseClosingTag)) {
				// end of a tool use
				currentToolUse.partial = false;
				contentBlocks.push(currentToolUse);
				currentToolUse = undefined;
				continue;
			} else {
				const possibleParamOpeningTags = toolParamNames.map((name) => `<${name}>`);
				for (const paramOpeningTag of possibleParamOpeningTags) {
					if (accumulator.endsWith(paramOpeningTag)) {
						// start of a new parameter
						currentParamName = paramOpeningTag.slice(1, -1) as ToolParamName;
						currentParamValueStartIndex = accumulator.length;
						break;
					}
				}

				// there's no current param, and not starting a new param

				const contentParamName: ToolParamName = "content";
				if (currentToolUse.name === "write_to_file" && accumulator.endsWith(`</${contentParamName}>`)) {
					const toolContent = accumulator.slice(currentToolUseStartIndex);
					const contentStartTag = `<${contentParamName}>`;
					const contentEndTag = `</${contentParamName}>`;
					const contentStartIndex = toolContent.indexOf(contentStartTag) + contentStartTag.length;
					const contentEndIndex = toolContent.lastIndexOf(contentEndTag);
					if (contentStartIndex !== -1 && contentEndIndex !== -1 && contentEndIndex > contentStartIndex) {
						currentToolUse.params[contentParamName] = toolContent
							.slice(contentStartIndex, contentEndIndex)
							.trim();
					}
				}

				// partial tool value is accumulating
				continue;
			}
		}

		let didStartToolUse = false;
		const possibleToolUseOpeningTags = toolUseNames.map((name) => `<${name}>`);
		for (const toolUseOpeningTag of possibleToolUseOpeningTags) {
			if (accumulator.endsWith(toolUseOpeningTag)) {
				// start of a new tool use
				currentToolUse = {
					type: "tool_use",
					name: toolUseOpeningTag.slice(1, -1) as ToolUseName,
					params: {},
					partial: true,
				};
				currentToolUseStartIndex = accumulator.length;
				// this also indicates the end of the current text content
				if (currentTextContent) {
					currentTextContent.partial = false;
					// remove the partially accumulated tool use tag from the end of text (<tool)
					currentTextContent.content = currentTextContent.content
						.slice(0, -toolUseOpeningTag.slice(0, -1).length)
						.trim();
					contentBlocks.push(currentTextContent);
					currentTextContent = undefined;
				}

				didStartToolUse = true;
				break;
			}
		}

		if (!didStartToolUse) {
			// no tool use, so it must be text either at the beginning or between tools
			if (currentTextContent === undefined) {
				currentTextContentStartIndex = i;
			}
			currentTextContent = {
				type: "text",
				content: accumulator.slice(currentTextContentStartIndex).trim(),
				partial: true,
			};
		}
	}

	if (currentToolUse) {
		// stream did not complete tool call, add it as partial
		if (currentParamName) {
			currentToolUse.params[currentParamName] = accumulator.slice(currentParamValueStartIndex).trim();
		}
		contentBlocks.push(currentToolUse);
	}

	if (currentTextContent) {
		contentBlocks.push(currentTextContent);
	}

	return contentBlocks.filter((block) => {
		if (block.type === "text") {
			return block.content.trim() !== "";
		}
		return true;
	});
}
