import { createClient } from '@supabase/supabase-js';
import { User } from '../types/domain.types';
import { AuthenticationError } from '@utils/httpError';
import { logger } from '@utils/logger';

export class AuthService {
  /**
   * Get current user session information
   * Verifies the token and returns user data from Supabase Auth
   */
  async getSession(token: string): Promise<User> {
    try {
      // Verify token with Supabase Auth
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !authUser) {
        logger.warn('Invalid token in getSession', { error: error?.message });
        throw new AuthenticationError('Invalid or expired token');
      }

      // Return user info directly from Supabase Auth
      return {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Error in getSession', { error });
      throw new AuthenticationError('Failed to verify session');
    }
  }
}

export default new AuthService();
