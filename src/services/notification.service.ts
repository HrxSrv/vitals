import { notificationRepository } from '../repositories/notification.repository';
import { NotificationPreferences } from '../types/domain.types';
import { logger } from '../utils/logger';

/**
 * Notification Service
 * Handles notification preferences management
 */
export class NotificationService {
  /**
   * Get notification preferences for a user
   * Creates default preferences if they don't exist
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    logger.debug('Getting notification preferences', { userId });
    return notificationRepository.findByUserId(userId);
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    data: {
      emailDigestEnabled?: boolean;
      digestFrequency?: 'monthly' | 'quarterly';
    }
  ): Promise<NotificationPreferences> {
    logger.info('Updating notification preferences', { userId, data });

    // Validate digest frequency
    if (
      data.digestFrequency &&
      !['monthly', 'quarterly'].includes(data.digestFrequency)
    ) {
      throw new Error(
        'Invalid digest frequency. Must be "monthly" or "quarterly".'
      );
    }

    return notificationRepository.update(userId, data);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
