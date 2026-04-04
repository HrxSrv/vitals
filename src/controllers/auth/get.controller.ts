import { Request, Response, NextFunction } from 'express';
import authService from '@services/auth.service';

/**
 * GET /api/auth/session
 * Get current user session information from Supabase Auth
 */
export async function getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Get session and user data from Supabase Auth
    const user = await authService.getSession(token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
}
