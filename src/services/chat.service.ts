import { mistralChatService, ChatMessage } from './mistral-chat.service';
import { mistralEmbedService } from './mistral-embed.service';
import { lhmService } from './lhm.service';
import { embeddingRepository } from '../repositories/embedding.repository';
import profileRepository from '../repositories/profile.repository';
import { detectProfileFromQuestion } from '../utils/profile-detector';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { Profile } from '../types/domain.types';

export interface ChatOptions {
  profileId?: string;
  useVectorSearch?: boolean;
  maxContextChunks?: number;
}

/**
 * Chat Service
 * Handles RAG-powered Q&A system for health data
 * Detects target profile, retrieves relevant context, and streams LLM responses
 */
export class ChatService {
  /**
   * Chat with the system about health data
   * @param userId - User ID
   * @param message - User's question
   * @param options - Chat options (profile ID, vector search, etc.)
   * @returns Async generator yielding response chunks
   */
  async *chat(
    userId: string,
    message: string,
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      logger.info('Starting chat', {
        userId,
        messageLength: message.length,
        options,
      });

      // Get user's profiles
      const profiles = await profileRepository.findByUserId(userId);

      if (profiles.length === 0) {
        throw new HttpError(404, 'No profiles found for user', 'NOT_FOUND');
      }

      // Detect target profile from question
      const targetProfile = await this.detectTargetProfile(
        message,
        profiles,
        options.profileId
      );

      logger.info('Target profile detected', {
        profileId: targetProfile.id,
        profileName: targetProfile.name,
        relationship: targetProfile.relationship,
      });

      // Build context for LLM
      const context = await this.buildContext(
        targetProfile,
        message,
        options
      );

      // Build system prompt with health data context
      const systemPrompt = this.buildSystemPrompt(targetProfile, context);

      // Build messages for LLM
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ];

      // Stream response from LLM
      logger.info('Streaming chat response', {
        profileId: targetProfile.id,
        contextLength: context.lhm.length + context.relevantChunks.join('\n').length,
      });

      for await (const chunk of mistralChatService.completeStream(messages, {
        temperature: 0.7,
        maxTokens: 1500,
      })) {
        yield chunk;
      }

      logger.info('Chat completed successfully', {
        userId,
        profileId: targetProfile.id,
      });
    } catch (error) {
      logger.error('Chat failed', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Detect which profile the question is about
   * Uses keyword matching and falls back to provided profileId or default profile
   */
  private async detectTargetProfile(
    message: string,
    profiles: Profile[],
    providedProfileId?: string
  ): Promise<Profile> {
    // If profile ID is explicitly provided, use it
    if (providedProfileId) {
      const profile = profiles.find((p) => p.id === providedProfileId);
      if (profile) {
        return profile;
      }
      logger.warn('Provided profile ID not found, falling back to detection', {
        providedProfileId,
      });
    }

    // Try to detect profile from question keywords
    const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0];
    const detectedProfile = detectProfileFromQuestion(
      message,
      profiles,
      defaultProfile
    );

    if (!detectedProfile) {
      throw new HttpError(
        400,
        'Could not determine which profile to query. Please specify a profile.',
        'PROFILE_DETECTION_FAILED'
      );
    }

    return detectedProfile;
  }

  /**
   * Build context for LLM from LHM and optionally vector search
   */
  private async buildContext(
    profile: Profile,
    message: string,
    options: ChatOptions
  ): Promise<{
    lhm: string;
    relevantChunks: string[];
  }> {
    // Always fetch LHM as primary context
    const lhm = await lhmService.getLHM(profile.id);

    const context = {
      lhm: lhm.markdown,
      relevantChunks: [] as string[],
    };

    // Optionally perform vector search for specific details
    if (options.useVectorSearch !== false) {
      try {
        const relevantChunks = await this.performVectorSearch(
          profile.id,
          message,
          options.maxContextChunks || 3
        );
        context.relevantChunks = relevantChunks;

        logger.info('Vector search completed', {
          profileId: profile.id,
          chunksFound: relevantChunks.length,
        });
      } catch (error) {
        logger.warn('Vector search failed, continuing with LHM only', {
          error: error instanceof Error ? error.message : error,
        });
        // Continue without vector search results
      }
    }

    return context;
  }

  /**
   * Perform vector similarity search to find relevant report chunks
   */
  private async performVectorSearch(
    profileId: string,
    query: string,
    maxChunks: number
  ): Promise<string[]> {
    // Generate embedding for the query
    const queryEmbedding = await mistralEmbedService.embed(query);

    // Search for similar chunks
    const results = await embeddingRepository.similaritySearch(
      profileId,
      queryEmbedding,
      maxChunks,
      0.7 // Similarity threshold
    );

    // Extract chunk texts
    return results.map((result) => result.chunkText);
  }

  /**
   * Build system prompt with health data context
   */
  private buildSystemPrompt(
    profile: Profile,
    context: { lhm: string; relevantChunks: string[] }
  ): string {
    const profileInfo = `Profile: ${profile.name} (${profile.relationship})`;

    let prompt = `You are a helpful health data assistant. You have access to health data for ${profile.name}.

${profileInfo}

## Living Health Markdown (Primary Context)

The following is a comprehensive health summary document:

\`\`\`markdown
${context.lhm}
\`\`\`
`;

    // Add relevant chunks if available
    if (context.relevantChunks.length > 0) {
      prompt += `\n## Additional Relevant Details

The following are specific excerpts from health reports that may be relevant to the question:

${context.relevantChunks.map((chunk, i) => `### Excerpt ${i + 1}\n${chunk}`).join('\n\n')}
`;
    }

    prompt += `\n## Instructions

- Answer questions based on the health data provided above
- Always cite specific values and dates when making statements
- If you don't have enough information to answer, say so clearly
- Be empathetic and supportive in your responses
- Explain medical terms in simple language
- If you notice concerning trends, mention them but avoid alarming language
- Remind users to consult healthcare professionals for medical advice
- Do not make up or infer data that is not present in the context

Answer the user's question now.`;

    return prompt;
  }
}

// Export singleton instance
export const chatService = new ChatService();
