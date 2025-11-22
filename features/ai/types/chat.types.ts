export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  accessCode?: string;
  model?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: string; // Estimated cost (e.g. "$0.001")
  model?: string;
}

export interface IChatService {
  /**
   * Streams a chat completion response.
   * @param history - The conversation history.
   * @param options - Configuration options.
   * @param onChunk - Callback for streaming chunks.
   * @param onUsage - Callback for final token usage stats.
   * @returns A promise that resolves to the full response text.
   */
  streamChatCompletion(
    history: ChatMessage[],
    options: ChatOptions,
    onChunk?: (chunk: string) => void,
    onUsage?: (usage: TokenUsage) => void
  ): Promise<string>;
}
