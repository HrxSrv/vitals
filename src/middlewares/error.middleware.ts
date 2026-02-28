import { Request, Response, NextFunction } from 'express';
import { HttpError } from '@utils/httpError';
import { logger } from '@utils/logger';

export function errorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof HttpError) {
    logger.warn('HTTP Error', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });

    const errorResponse: {
      code: string;
      message: string;
      details?: unknown;
    } = {
      code: error.code,
      message: error.message,
    };

    if (error.details) {
      errorResponse.details = error.details;
    }

    return res.status(error.statusCode).json({ error: errorResponse });
  }

  // Unhandled errors
  logger.error('Unhandled error', error);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
