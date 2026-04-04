import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticationError } from '@utils/httpError';
import { logger } from '@utils/logger';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies Supabase JWT token and attaches user info to request
 * Uses Supabase Auth as the single source of truth (no separate users table)
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Authentication failed', { error: error?.message });
      throw new AuthenticationError('Invalid or expired token');
    }

    // Attach Supabase Auth user info directly to request
    req.user = {
      id: user.id, // Supabase Auth UUID
      email: user.email!,
      name: user.user_metadata?.name,
    };

    next();
  } catch (error) {
    next(error);
  }
}
