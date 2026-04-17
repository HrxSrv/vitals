import { supabaseAdmin } from '../services/supabase.service';
import {
  ChatMessageRecord,
  ChatMessageRole,
  ChatSession,
} from '../types/domain.types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export class ChatRepository {
  async createSession(data: {
    userId: string;
    profileId: string;
    title?: string;
  }): Promise<ChatSession> {
    try {
      const { data: row, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
          user_id: data.userId,
          profile_id: data.profileId,
          ...(data.title ? { title: data.title } : {}),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create chat session:', error);
        throw new HttpError(500, `Failed to create chat session: ${error.message}`, 'DB_ERROR');
      }

      return this.mapToSession(row);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error creating chat session:', error);
      throw new HttpError(500, 'Failed to create chat session', 'DB_ERROR');
    }
  }

  async listSessions(userId: string, profileId?: string): Promise<ChatSession[]> {
    try {
      let query = supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false });

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch chat sessions:', error);
        throw new HttpError(500, `Failed to fetch chat sessions: ${error.message}`, 'DB_ERROR');
      }

      return (data ?? []).map(this.mapToSession);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error fetching chat sessions:', error);
      throw new HttpError(500, 'Failed to fetch chat sessions', 'DB_ERROR');
    }
  }

  async findSessionById(sessionId: string): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        logger.error('Failed to fetch chat session:', error);
        throw new HttpError(500, `Failed to fetch chat session: ${error.message}`, 'DB_ERROR');
      }

      return this.mapToSession(data);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error fetching chat session:', error);
      throw new HttpError(500, 'Failed to fetch chat session', 'DB_ERROR');
    }
  }

  async renameSession(sessionId: string, title: string): Promise<ChatSession> {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to rename chat session:', error);
        throw new HttpError(500, `Failed to rename chat session: ${error.message}`, 'DB_ERROR');
      }

      return this.mapToSession(data);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error renaming chat session:', error);
      throw new HttpError(500, 'Failed to rename chat session', 'DB_ERROR');
    }
  }

  async touchSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        logger.error('Failed to touch chat session:', error);
        throw new HttpError(500, `Failed to touch chat session: ${error.message}`, 'DB_ERROR');
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error touching chat session:', error);
      throw new HttpError(500, 'Failed to touch chat session', 'DB_ERROR');
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        logger.error('Failed to delete chat session:', error);
        throw new HttpError(500, `Failed to delete chat session: ${error.message}`, 'DB_ERROR');
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error deleting chat session:', error);
      throw new HttpError(500, 'Failed to delete chat session', 'DB_ERROR');
    }
  }

  async appendMessage(data: {
    sessionId: string;
    userId: string;
    profileId: string;
    role: ChatMessageRole;
    content: string;
    isPartial?: boolean;
  }): Promise<ChatMessageRecord> {
    try {
      const { data: row, error } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          session_id: data.sessionId,
          user_id: data.userId,
          profile_id: data.profileId,
          role: data.role,
          content: data.content,
          is_partial: data.isPartial ?? false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to append chat message:', error);
        throw new HttpError(500, `Failed to append chat message: ${error.message}`, 'DB_ERROR');
      }

      return this.mapToMessage(row);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error appending chat message:', error);
      throw new HttpError(500, 'Failed to append chat message', 'DB_ERROR');
    }
  }

  async listMessages(sessionId: string): Promise<ChatMessageRecord[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch chat messages:', error);
        throw new HttpError(500, `Failed to fetch chat messages: ${error.message}`, 'DB_ERROR');
      }

      return (data ?? []).map(this.mapToMessage);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.error('Unexpected error fetching chat messages:', error);
      throw new HttpError(500, 'Failed to fetch chat messages', 'DB_ERROR');
    }
  }

  private mapToSession = (row: any): ChatSession => ({
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    title: row.title,
    createdAt: new Date(row.created_at),
    lastMessageAt: new Date(row.last_message_at),
  });

  private mapToMessage = (row: any): ChatMessageRecord => ({
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    profileId: row.profile_id,
    role: row.role as ChatMessageRole,
    content: row.content,
    isPartial: !!row.is_partial,
    createdAt: new Date(row.created_at),
  });
}

export const chatRepository = new ChatRepository();
