import { chatRepository } from '../repositories/chat.repository';
import profileRepository from '../repositories/profile.repository';
import {
  ChatMessageRecord,
  ChatSession,
  ChatSessionWithMessages,
} from '../types/domain.types';
import { AuthorizationError, NotFoundError } from '../utils/httpError';
import { logger } from '../utils/logger';

const TITLE_MAX_LEN = 60;

/**
 * Orchestrates chat session lifecycle (create/list/get/rename/delete).
 * The streaming-chat path lives in chat.service.ts; this service is only for CRUD.
 */
export class ChatSessionService {
  async listSessions(userId: string, profileId?: string): Promise<ChatSession[]> {
    if (profileId) {
      await this.assertProfileOwnership(userId, profileId);
    }
    return chatRepository.listSessions(userId, profileId);
  }

  async getSessionWithMessages(
    userId: string,
    sessionId: string
  ): Promise<ChatSessionWithMessages> {
    const session = await this.getOwnedSession(userId, sessionId);
    const messages = await chatRepository.listMessages(sessionId);
    return { ...session, messages };
  }

  async createSession(
    userId: string,
    profileId: string,
    title?: string
  ): Promise<ChatSession> {
    await this.assertProfileOwnership(userId, profileId);
    return chatRepository.createSession({ userId, profileId, title });
  }

  async renameSession(
    userId: string,
    sessionId: string,
    title: string
  ): Promise<ChatSession> {
    await this.getOwnedSession(userId, sessionId);
    return chatRepository.renameSession(sessionId, title);
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    await this.getOwnedSession(userId, sessionId);
    await chatRepository.deleteSession(sessionId);
    logger.info('Chat session deleted', { userId, sessionId });
  }

  /**
   * Resolve or create the session used by a streaming chat turn.
   * Also validates ownership if a sessionId is supplied.
   */
  async resolveOrCreateSession(params: {
    userId: string;
    profileId: string;
    sessionId?: string;
    firstMessage?: string;
  }): Promise<{ session: ChatSession; created: boolean }> {
    if (params.sessionId) {
      const session = await this.getOwnedSession(params.userId, params.sessionId);
      return { session, created: false };
    }

    const title = params.firstMessage ? deriveTitle(params.firstMessage) : undefined;
    const session = await chatRepository.createSession({
      userId: params.userId,
      profileId: params.profileId,
      title,
    });
    return { session, created: true };
  }

  async appendMessage(params: {
    sessionId: string;
    userId: string;
    profileId: string;
    role: 'user' | 'assistant';
    content: string;
    isPartial?: boolean;
  }): Promise<ChatMessageRecord> {
    return chatRepository.appendMessage(params);
  }

  async touchSession(sessionId: string): Promise<void> {
    return chatRepository.touchSession(sessionId);
  }

  private async getOwnedSession(userId: string, sessionId: string): Promise<ChatSession> {
    const session = await chatRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Chat session');
    }
    if (session.userId !== userId) {
      throw new AuthorizationError('Unauthorized to access this chat session');
    }
    return session;
  }

  private async assertProfileOwnership(userId: string, profileId: string): Promise<void> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new NotFoundError('Profile');
    }
    if (profile.userId !== userId) {
      throw new AuthorizationError('Unauthorized to access this profile');
    }
  }
}

function deriveTitle(message: string): string {
  const collapsed = message.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= TITLE_MAX_LEN) return collapsed;
  return collapsed.slice(0, TITLE_MAX_LEN - 1).trimEnd() + '…';
}

export const chatSessionService = new ChatSessionService();
