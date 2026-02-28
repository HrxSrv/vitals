import { supabaseAdmin } from '../services/supabase.service';
import { NotificationPreferences } from '../types/domain.types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

/**
 * Notification Preferences Repository
 * Handles database operations for notification preferences
 */
export class NotificationRepository {
  /**
   * Get notification preferences for a user
   * Creates default preferences if they don't exist
   */
  async findByUserId(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('notification_prefs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - create default preferences
        logger.info('Creating default notification preferences', { userId });
        return this.create(userId);
      }
      throw new HttpError(
        500,
        `Failed to fetch notification preferences: ${error.message}`,
        'DATABASE_ERROR'
      );
    }

    return this.mapToDomain(data);
  }

  /**
   * Create default notification preferences for a user
   */
  async create(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('notification_prefs')
      .insert({
        user_id: userId,
        email_digest_enabled: true,
        digest_frequency: 'monthly',
        last_sent_at: null,
      })
      .select()
      .single();

    if (error) {
      throw new HttpError(
        500,
        `Failed to create notification preferences: ${error.message}`,
        'DATABASE_ERROR'
      );
    }

    return this.mapToDomain(data);
  }

  /**
   * Update notification preferences
   */
  async update(
    userId: string,
    data: {
      emailDigestEnabled?: boolean;
      digestFrequency?: 'monthly' | 'quarterly';
    }
  ): Promise<NotificationPreferences> {
    const updateData: Record<string, any> = {};

    if (data.emailDigestEnabled !== undefined) {
      updateData.email_digest_enabled = data.emailDigestEnabled;
    }
    if (data.digestFrequency !== undefined) {
      updateData.digest_frequency = data.digestFrequency;
    }

    const { data: prefs, error } = await supabaseAdmin
      .from('notification_prefs')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new HttpError(404, 'Notification preferences not found', 'NOT_FOUND');
      }
      throw new HttpError(
        500,
        `Failed to update notification preferences: ${error.message}`,
        'DATABASE_ERROR'
      );
    }

    return this.mapToDomain(prefs);
  }

  /**
   * Update last sent timestamp
   */
  async updateLastSent(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notification_prefs')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      throw new HttpError(
        500,
        `Failed to update last sent timestamp: ${error.message}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Get all users with email digest enabled
   * Used by cron job to send monthly digests
   */
  async findEligibleForDigest(): Promise<
    Array<{ userId: string; email: string; digestFrequency: string }>
  > {
    // Query notification_prefs joined with auth.users to get email addresses
    // Note: This requires a database function or direct auth.users access
    // For now, we'll return user IDs and fetch emails separately
    const { data, error } = await supabaseAdmin
      .from('notification_prefs')
      .select('user_id, digest_frequency, last_sent_at')
      .eq('email_digest_enabled', true);

    if (error) {
      throw new HttpError(
        500,
        `Failed to fetch eligible users: ${error.message}`,
        'DATABASE_ERROR'
      );
    }

    // Filter based on digest frequency and last sent date
    const now = new Date();
    const eligible = data.filter((pref) => {
      if (!pref.last_sent_at) {
        return true; // Never sent before
      }

      const lastSent = new Date(pref.last_sent_at);
      const daysSinceLastSent = Math.floor(
        (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (pref.digest_frequency === 'monthly') {
        return daysSinceLastSent >= 30;
      } else if (pref.digest_frequency === 'quarterly') {
        return daysSinceLastSent >= 90;
      }

      return false;
    });

    // Return user IDs (email fetching will be done separately via Supabase Auth)
    return eligible.map((pref) => ({
      userId: pref.user_id,
      email: '', // Will be populated by the service
      digestFrequency: pref.digest_frequency || 'monthly',
    }));
  }

  /**
   * Map database row to domain NotificationPreferences
   */
  private mapToDomain(row: any): NotificationPreferences {
    return {
      userId: row.user_id,
      emailDigestEnabled: row.email_digest_enabled,
      digestFrequency: row.digest_frequency,
      lastSentAt: row.last_sent_at ? new Date(row.last_sent_at) : undefined,
    };
  }
}

// Export singleton instance
export const notificationRepository = new NotificationRepository();
