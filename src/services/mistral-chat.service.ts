import { Mistral } from '@mistralai/mistralai';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class MistralChatService {
  private client: Mistral;
  private readonly DEFAULT_MODEL = 'mistral-large-2512';
  private readonly MAX_CONTEXT_TOKENS = 128000; // Mistral Large 2512 context window

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }

    this.client = new Mistral({
      apiKey,
    });
  }

  /**
   * Complete a chat conversation with non-streaming response
   * @param messages - Array of chat messages
   * @param options - Completion options
   * @returns Assistant's response text
   */
  async complete(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 2000 } = options;

    try {
      logger.info('Starting chat completion', {
        messageCount: messages.length,
        temperature,
        maxTokens,
      });

      // Manage context window
      const managedMessages = this.manageContextWindow(messages, maxTokens);

      const result = await withRetry(
        async () => {
          const response = await this.client.chat.complete({
            model: this.DEFAULT_MODEL,
            messages: managedMessages,
            temperature,
            maxTokens,
          });

          const content = response.choices?.[0]?.message?.content;

          if (!content || typeof content !== 'string') {
            throw new ExternalServiceError(
              'Mistral Chat',
              'No response generated'
            );
          }

          return content;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          shouldRetry: (error: any) => {
            const statusCode = error?.response?.status;
            const shouldRetry =
              statusCode === 429 || // Rate limit
              statusCode === 500 || // Server error
              statusCode === 502 || // Bad gateway
              statusCode === 503 || // Service unavailable
              statusCode === 504; // Gateway timeout

            if (shouldRetry) {
              logger.warn('Retrying chat completion', {
                statusCode,
                error: error.message,
              });
            }

            return shouldRetry;
          },
        }
      );

      logger.info('Chat completion successful', {
        responseLength: result.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Chat completion failed', {
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Mistral Chat',
        error.message || 'Failed to generate chat response'
      );
    }
  }

  /**
   * Complete a chat conversation with streaming response
   * @param messages - Array of chat messages
   * @param options - Completion options
   * @returns Async generator yielding response chunks
   */
  async *completeStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const { temperature = 0.7, maxTokens = 2000 } = options;

    try {
      logger.info('Starting streaming chat completion', {
        messageCount: messages.length,
        temperature,
        maxTokens,
      });

      // Manage context window
      const managedMessages = this.manageContextWindow(messages, maxTokens);

      const stream = await this.client.chat.stream({
        model: this.DEFAULT_MODEL,
        messages: managedMessages,
        temperature,
        maxTokens,
      });

      let totalChunks = 0;

      for await (const chunk of stream) {
        const content = chunk.data.choices?.[0]?.delta?.content;

        if (content && typeof content === 'string') {
          totalChunks++;
          yield content;
        }
      }

      logger.info('Streaming chat completion finished', {
        totalChunks,
      });
    } catch (error: any) {
      logger.error('Streaming chat completion failed', {
        error: error.message,
        stack: error.stack,
      });

      throw new ExternalServiceError(
        'Mistral Chat',
        error.message || 'Failed to stream chat response'
      );
    }
  }

  /**
   * Extract structured data from text using JSON mode
   * @param prompt - Extraction prompt
   * @param text - Text to extract from
   * @param schema - Expected JSON schema description
   * @returns Parsed JSON object
   */
  async extractStructured<T = any>(
    prompt: string,
    text: string,
    schema?: string
  ): Promise<T> {
    try {
      const systemPrompt = schema
        ? `${prompt}\n\nReturn ONLY valid JSON matching this schema: ${schema}`
        : `${prompt}\n\nReturn ONLY valid JSON, no additional text.`;

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ];

      const response = await this.complete(messages, {
        temperature: 0.1, // Low temperature for consistent extraction
        maxTokens: 4000,
      });

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;

      try {
        return JSON.parse(jsonText.trim());
      } catch (parseError) {
        logger.error('Failed to parse JSON response', {
          response: jsonText,
          error: parseError,
        });
        throw new ExternalServiceError(
          'Mistral Chat',
          'Invalid JSON response from LLM'
        );
      }
    } catch (error: any) {
      logger.error('Structured extraction failed', {
        error: error.message,
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Mistral Chat',
        error.message || 'Failed to extract structured data'
      );
    }
  }

  /**
   * Manage context window by truncating older messages if needed
   * @param messages - Original messages
   * @param maxOutputTokens - Maximum tokens for output
   * @returns Managed messages that fit within context window
   */
  private manageContextWindow(
    messages: ChatMessage[],
    maxOutputTokens: number
  ): ChatMessage[] {
    // Reserve tokens for output
    const maxInputTokens = this.MAX_CONTEXT_TOKENS - maxOutputTokens;

    // Rough estimation: 1 token ≈ 4 characters
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);

    let totalTokens = 0;
    const managedMessages: ChatMessage[] = [];

    // Always keep system message if present
    if (messages[0]?.role === 'system') {
      managedMessages.push(messages[0]);
      totalTokens += estimateTokens(messages[0].content);
    }

    // Add messages from most recent, working backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'system') continue; // Already added

      const messageTokens = estimateTokens(messages[i].content);

      if (totalTokens + messageTokens > maxInputTokens) {
        logger.warn('Context window limit reached, truncating older messages', {
          totalMessages: messages.length,
          keptMessages: managedMessages.length,
        });
        break;
      }

      managedMessages.unshift(messages[i]);
      totalTokens += messageTokens;
    }

    return managedMessages;
  }

  /**
   * Estimate token count for text
   * @param text - Text to estimate
   * @returns Approximate token count
   */
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Health check for Mistral Chat service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.complete(
        [
          {
            role: 'user',
            content: 'test',
          },
        ],
        {
          maxTokens: 5,
        }
      );
      return true;
    } catch (error) {
      logger.error('Mistral Chat health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const mistralChatService = new MistralChatService();
