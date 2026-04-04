/**
 * AI Provider Abstraction Layer
 *
 * Unified interface for chat completions, streaming, structured extraction,
 * and embeddings. Switch providers via AI_PROVIDER env var (mistral | openai).
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}

export interface AIChatProvider {
  complete(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<string>;
  completeStream(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<string, void, unknown>;
  extractStructured<T = any>(prompt: string, text: string, schema?: string): Promise<T>;
  estimateTokens(text: string): number;
}

export interface AIEmbedProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
  getEmbeddingDimensions(): number;
}

// ─── Provider selection ───────────────────────────────────────────────────────

type ProviderName = 'mistral' | 'openai';

function resolveProvider(): ProviderName {
  const val = (process.env.AI_PROVIDER ?? 'mistral').toLowerCase();
  if (val === 'openai') return 'openai';
  return 'mistral';
}

// Lazy singletons — only instantiated when first accessed
let _chatProvider: AIChatProvider | null = null;
let _embedProvider: AIEmbedProvider | null = null;

export function getChatProvider(): AIChatProvider {
  if (_chatProvider) return _chatProvider;
  const provider = resolveProvider();
  if (provider === 'openai') {
    const { openAIChatService } = require('./openai-chat.service');
    _chatProvider = openAIChatService;
  } else {
    const { mistralChatService } = require('./mistral-chat.service');
    _chatProvider = mistralChatService;
  }
  return _chatProvider!;
}

export function getEmbedProvider(): AIEmbedProvider {
  if (_embedProvider) return _embedProvider;
  const provider = resolveProvider();
  if (provider === 'openai') {
    const { openAIEmbedService } = require('./openai-embed.service');
    _embedProvider = openAIEmbedService;
  } else {
    const { mistralEmbedService } = require('./mistral-embed.service');
    _embedProvider = mistralEmbedService;
  }
  return _embedProvider!;
}
