import { Request, Response, NextFunction } from 'express';
import { chatService } from '../../services/chat.service';
import { logger } from '../../utils/logger';

/**
 * POST /api/chat
 * Stream chat response using Server-Sent Events (SSE)
 * 
 * Request body:
 * {
 *   message: string;
 *   profileId?: string;
 *   useVectorSearch?: boolean;
 * }
 */
export async function postChat(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { message, profileId, useVectorSearch } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required and must be a string',
        },
      });
      return;
    }

    logger.info('Chat request received', {
      userId,
      messageLength: message.length,
      profileId,
    });

    // Set up Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection event
    res.write('event: connected\n');
    res.write('data: {"status":"connected"}\n\n');

    try {
      // Stream response chunks
      for await (const chunk of chatService.chat(userId, message, {
        profileId,
        useVectorSearch,
      })) {
        // Send chunk as SSE event
        res.write('event: message\n');
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Send completion event
      res.write('event: done\n');
      res.write('data: {"status":"completed"}\n\n');
      res.end();

      logger.info('Chat stream completed', { userId });
    } catch (streamError: any) {
      logger.error('Chat stream error', {
        userId,
        error: streamError.message,
      });

      // Send error event
      res.write('event: error\n');
      res.write(
        `data: ${JSON.stringify({
          error: {
            code: streamError.code || 'STREAM_ERROR',
            message: streamError.message || 'An error occurred during streaming',
          },
        })}\n\n`
      );
      res.end();
    }
  } catch (error) {
    next(error);
  }
}
