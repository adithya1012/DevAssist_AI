export type ApiStream = AsyncGenerator<ApiStreamChunk>;
export type ApiStreamChunk = ApiStreamTextChunk;

export interface ApiStreamTextChunk {
	type: "text";
	text: string;
}
