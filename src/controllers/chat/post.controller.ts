import { Request, Response, NextFunction } from 'express';
import { chatService } from '../../services/chat.service';
import { chatSessionService } from '../../services/chat-session.service';
import { logger } from '../../utils/logger';

/**
 * POST /api/chat
 * Stream chat response via Server-Sent Events.
 *
 * Body: { message, profileId?, sessionId?, useVectorSearch? }
 *
 * Persistence flow:
 *   1. Resolve target profile (re-uses chat.service's detection).
 *   2. Resolve or create session (owned by user, bound to profile).
 *   3. Persist user message before the LLM stream starts.
 *   4. Stream chunks to the client while accumulating an assistant buffer.
 *   5. On completion, persist the assistant message and bump last_message_at.
 *      If the client disconnects or the stream errors mid-way, persist whatever
 *      was accumulated with is_partial=true so history reflects reality.
 */
export async function postChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user!.id;
  const { message, profileId, sessionId, useVectorSearch } = req.body as {
    message: string;
    profileId?: string;
    sessionId?: string;
    useVectorSearch?: boolean;
  };

  let sseStarted = false;
  let aborted = false;
  let streamErrored = false;
  let assistantBuffer = '';
  let resolvedSessionId: string | null = null;
  let resolvedProfileId: string | null = null;

  req.on('close', () => {
    if (!res.writableEnded) {
      aborted = true;
    }
  });

  try {
    const targetProfile = await chatService.resolveTargetProfile(userId, message, profileId);
    resolvedProfileId = targetProfile.id;

    const { session, created } = await chatSessionService.resolveOrCreateSession({
      userId,
      profileId: targetProfile.id,
      sessionId,
      firstMessage: message,
    });
    resolvedSessionId = session.id;

    await chatSessionService.appendMessage({
      sessionId: session.id,
      userId,
      profileId: targetProfile.id,
      role: 'user',
      content: message,
    });

    logger.info('Chat request received', {
      userId,
      messageLength: message.length,
      profileId: targetProfile.id,
      sessionId: session.id,
      sessionCreated: created,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // Force the response headers to the wire so the client can start reading.
    res.flushHeaders();
    sseStarted = true;

    res.write(
      `event: session\ndata: ${JSON.stringify({
        sessionId: session.id,
        profileId: session.profileId,
        title: session.title,
        created,
      })}\n\n`
    );

    res.write('event: connected\ndata: {"status":"connected"}\n\n');

    try {
      for await (const chunk of chatService.chat(userId, message, {
        profileId: targetProfile.id,
        useVectorSearch,
      })) {
        if (aborted) break;
        assistantBuffer += chunk;
        res.write(`event: message\ndata: ${JSON.stringify({ chunk })}\n\n`);
      }

      if (!aborted) {
        res.write('event: done\ndata: {"status":"completed"}\n\n');
        res.end();
        logger.info('Chat stream completed', { userId, sessionId: session.id });
      }
    } catch (streamError: any) {
      streamErrored = true;
      logger.error('Chat stream error', {
        userId,
        sessionId: session.id,
        error: streamError.message,
      });

      if (!res.writableEnded) {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            error: {
              code: streamError.code || 'STREAM_ERROR',
              message: streamError.message || 'An error occurred during streaming',
            },
          })}\n\n`
        );
        res.end();
      }
    }
  } catch (error) {
    if (sseStarted && !res.writableEnded) {
      res.write('event: error\n');
      res.write(
        `data: ${JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to start chat' },
        })}\n\n`
      );
      res.end();
      return;
    }
    if (!sseStarted) {
      next(error);
      return;
    }
  } finally {
    if (resolvedSessionId && resolvedProfileId) {
      const hasContent = assistantBuffer.length > 0;
      const isPartial = aborted || streamErrored;

      try {
        if (hasContent) {
          await chatSessionService.appendMessage({
            sessionId: resolvedSessionId,
            userId,
            profileId: resolvedProfileId,
            role: 'assistant',
            content: assistantBuffer,
            isPartial,
          });
        }
        await chatSessionService.touchSession(resolvedSessionId);
      } catch (persistError: any) {
        logger.error('Failed to persist assistant message', {
          userId,
          sessionId: resolvedSessionId,
          isPartial,
          error: persistError?.message,
        });
      }
    }
  }
}
