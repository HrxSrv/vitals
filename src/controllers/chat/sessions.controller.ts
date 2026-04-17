import { Request, Response, NextFunction } from 'express';
import { chatSessionService } from '../../services/chat-session.service';
import { ChatMessageRecord, ChatSession } from '../../types/domain.types';

function serializeSession(session: ChatSession) {
  return {
    id: session.id,
    profileId: session.profileId,
    title: session.title,
    createdAt: session.createdAt,
    lastMessageAt: session.lastMessageAt,
  };
}

function serializeMessage(message: ChatMessageRecord) {
  return {
    id: message.id,
    sessionId: message.sessionId,
    profileId: message.profileId,
    role: message.role,
    content: message.content,
    isPartial: message.isPartial,
    createdAt: message.createdAt,
  };
}

/**
 * GET /api/chat/sessions?profileId=xxx
 */
export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const profileId = (req.query.profileId as string | undefined) || undefined;
    const sessions = await chatSessionService.listSessions(userId, profileId);
    res.json({ sessions: sessions.map(serializeSession) });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/chat/sessions/:id
 */
export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const result = await chatSessionService.getSessionWithMessages(userId, sessionId);
    res.json({
      session: serializeSession(result),
      messages: result.messages.map(serializeMessage),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/chat/sessions
 */
export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { profileId, title } = req.body as { profileId: string; title?: string };
    const session = await chatSessionService.createSession(userId, profileId, title);
    res.status(201).json({ session: serializeSession(session) });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/chat/sessions/:id
 */
export async function renameSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const { title } = req.body as { title: string };
    const session = await chatSessionService.renameSession(userId, sessionId, title);
    res.json({ session: serializeSession(session) });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/chat/sessions/:id
 */
export async function deleteSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    await chatSessionService.deleteSession(userId, sessionId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
