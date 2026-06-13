import { deviceTokenRepository } from '../repositories/device-token.repository';
import { logger } from '../utils/logger';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
// Expo accepts up to 100 messages per request.
const EXPO_BATCH_SIZE = 100;

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Push Service
 * Sends Expo push notifications to a user's registered devices and prunes
 * tokens Expo reports as no longer registered.
 */
export class PushService {
  /**
   * Send a push notification to every device registered for a user.
   * Best-effort: failures are logged, never thrown, so callers (e.g. the report
   * worker) are not derailed by notification problems.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await deviceTokenRepository.findByUserId(userId);
    if (tokens.length === 0) {
      logger.debug('No device tokens registered, skipping push', { userId });
      return;
    }

    const tokenValues = tokens.map((t) => t.token);

    for (let i = 0; i < tokenValues.length; i += EXPO_BATCH_SIZE) {
      const batch = tokenValues.slice(i, i + EXPO_BATCH_SIZE);
      await this.sendBatch(batch, payload, userId);
    }
  }

  private async sendBatch(tokens: string[], payload: PushPayload, userId: string): Promise<void> {
    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }));

    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        logger.error('Expo push request failed', {
          userId,
          status: response.status,
          body: await response.text().catch(() => ''),
        });
        return;
      }

      const result = (await response.json()) as { data?: ExpoPushTicket[] };
      const tickets = result.data ?? [];

      // Match tickets back to tokens by index to prune dead tokens.
      const deadTokens: string[] = [];
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          logger.warn('Expo push ticket error', {
            userId,
            error: ticket.details?.error,
            message: ticket.message,
          });
          if (ticket.details?.error === 'DeviceNotRegistered' && tokens[index]) {
            deadTokens.push(tokens[index]);
          }
        }
      });

      if (deadTokens.length > 0) {
        await deviceTokenRepository.deleteByTokens(deadTokens);
        logger.info('Pruned unregistered device tokens', { userId, count: deadTokens.length });
      }
    } catch (error) {
      logger.error('Failed to send push notifications', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}

// Export singleton instance
export const pushService = new PushService();
