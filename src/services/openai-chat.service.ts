import OpenAI from 'openai';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';
import type { AIChatProvider, ChatMessage, ChatCompletionOptions } from './ai-provider';

export class OpenAIChatService implements AIChatProvider {
  private client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required');
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o';
  }

  async complete(messages: ChatMessage[], options: ChatCompletionOptions = {}): Promise<string> {
    const { temperature = 0.7, maxTokens = 2000 } = options;
    try {
      const result = await withRetry(
        async () => {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature,
            max_completion_tokens: maxTokens,
          });
          const content = response.choices[0]?.message?.content;
          if (!content) throw new ExternalServiceError('OpenAI Chat', 'No response generated');
          return content;
        },
        { maxAttempts: 3, initialDelayMs: 1000, backoffMultiplier: 2, shouldRetry: isRetryable }
      );
      return result;
    } catch (error: any) {
      logger.error('OpenAI chat completion failed', { error: error.message });
      throw error instanceof ExternalServiceError
        ? error
        : new ExternalServiceError('OpenAI Chat', error.message);
    }
  }

  async *completeStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const { temperature = 0.7, maxTokens = 2000 } = options;
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
    } catch (error: any) {
      logger.error('OpenAI streaming failed', { error: error.message });
      throw new ExternalServiceError('OpenAI Chat', error.message);
    }
  }

  async extractStructured<T = any>(prompt: string, text: string, schema?: string): Promise<T> {
    const systemPrompt = schema
      ? `${prompt}\n\nReturn ONLY valid JSON matching this schema: ${schema}`
      : `${prompt}\n\nReturn ONLY valid JSON, no additional text.`;

    const response = await this.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      { temperature: 0.1, maxTokens: 4000 }
    );

    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response;
    try {
      return JSON.parse(jsonText.trim());
    } catch {
      throw new ExternalServiceError('OpenAI Chat', 'Invalid JSON response from LLM');
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

function isRetryable(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  return [429, 500, 502, 503, 504].includes(status);
}

export const openAIChatService = new OpenAIChatService();
