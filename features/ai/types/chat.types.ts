export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  accessCode?: string;
  model?: string;
}

export interface IChatService {
  /**
   * Streams a chat completion response.
   * @param history - The conversation history.
   * @param options - Configuration options.
   * @param onChunk - Callback for streaming chunks.
   * @returns A promise that resolves to the full response text.
   */
  streamChatCompletion(
    history: ChatMessage[],
    options: ChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string>;
}
