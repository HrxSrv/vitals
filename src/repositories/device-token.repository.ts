import { supabaseAdmin } from '../services/supabase.service';
import { DevicePlatform, DeviceToken } from '../types/domain.types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

// supabaseAdmin is typed against the generated Database type which doesn't yet
// include the new device_tokens table. Cast to any for those queries until the
// types are regenerated (pnpm run db:types) after the migration is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/**
 * Device Token Repository
 * Handles database operations for Expo push notification tokens
 */
export class DeviceTokenRepository {
  /**
   * Register (upsert) a device token for a user.
   * The token is globally unique, so re-registering the same token — whether
   * by the same user or after a re-install — updates ownership and platform.
   */
  async upsert(userId: string, token: string, platform: DevicePlatform): Promise<DeviceToken> {
    const { data, error } = await db
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )
      .select()
      .single();

    if (error) {
      throw new HttpError(
        500,
        `Failed to register device token: ${error.message}`,
        'DATABASE_ERROR'
      );
    }

    return this.mapToDomain(data);
  }

  /**
   * Get all device tokens for a user (one per device they've registered).
   */
  async findByUserId(userId: string): Promise<DeviceToken[]> {
    const { data, error } = await db.from('device_tokens').select('*').eq('user_id', userId);

    if (error) {
      throw new HttpError(500, `Failed to fetch device tokens: ${error.message}`, 'DATABASE_ERROR');
    }

    return (data ?? []).map((row: any) => this.mapToDomain(row));
  }

  /**
   * Delete tokens by value. Used to prune tokens Expo reports as unregistered.
   */
  async deleteByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    const { error } = await db.from('device_tokens').delete().in('token', tokens);

    if (error) {
      // Pruning is best-effort — log and move on rather than failing the caller.
      logger.warn('Failed to prune device tokens', { error: error.message, count: tokens.length });
    }
  }

  private mapToDomain(row: any): DeviceToken {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      platform: row.platform,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton instance
export const deviceTokenRepository = new DeviceTokenRepository();
