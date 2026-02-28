import cron from 'node-cron';
import { queueService } from '../services/queue.service';
import { notificationRepository } from '../repositories/notification.repository';
import { supabaseAdmin } from '../services/supabase.service';
import { logger } from '../utils/logger';

/**
 * Cron Job Manager
 * Handles scheduled tasks like monthly digest emails
 */
export class CronManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all cron jobs
   */
  start(): void {
    logger.info('Starting cron jobs');

    // Monthly digest - runs on the 1st of every month at 9:00 AM
    this.scheduleMonthlyDigest();

    logger.info('All cron jobs started', {
      jobCount: this.jobs.size,
    });
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    logger.info('Stopping cron jobs');

    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info('Cron job stopped', { name });
    });

    this.jobs.clear();
  }

  /**
   * Schedule monthly digest email job
   * Runs on the 1st of every month at 9:00 AM
   */
  private scheduleMonthlyDigest(): void {
    const jobName = 'monthly-digest';

    // Cron expression: "0 9 1 * *" = At 09:00 on day-of-month 1
    const schedule = '0 9 1 * *';

    const job = cron.schedule(
      schedule,
      async () => {
        logger.info('Monthly digest cron job triggered');

        try {
          await this.enqueueMonthlyDigests();
        } catch (error) {
          logger.error('Monthly digest cron job failed', {
            error: error instanceof Error ? error.message : error,
          });
        }
      },
      {
        timezone: 'UTC', // Use UTC timezone
      }
    );

    this.jobs.set(jobName, job);

    logger.info('Monthly digest cron job scheduled', {
      name: jobName,
      schedule,
      timezone: 'UTC',
    });
  }

  /**
   * Enqueue send-digest jobs for all eligible users
   */
  private async enqueueMonthlyDigests(): Promise<void> {
    try {
      logger.info('Enqueuing monthly digest jobs');

      // Get all users eligible for digest
      const eligibleUsers = await notificationRepository.findEligibleForDigest();

      logger.info('Found eligible users for digest', {
        count: eligibleUsers.length,
      });

      // Enqueue a job for each user
      let enqueuedCount = 0;
      let failedCount = 0;

      for (const user of eligibleUsers) {
        try {
          // Fetch user email from Supabase Auth
          const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(
            user.userId
          );

          if (error || !authUser?.user?.email) {
            logger.warn('Skipping user without email', {
              userId: user.userId,
              error: error?.message,
            });
            failedCount++;
            continue;
          }

          // Enqueue send-digest job
          await queueService.enqueueSendDigest({ userId: user.userId });
          enqueuedCount++;

          logger.debug('Enqueued digest job for user', {
            userId: user.userId,
            email: authUser.user.email,
          });
        } catch (error) {
          logger.error('Failed to enqueue digest job for user', {
            userId: user.userId,
            error: error instanceof Error ? error.message : error,
          });
          failedCount++;
        }
      }

      logger.info('Monthly digest jobs enqueued', {
        total: eligibleUsers.length,
        enqueued: enqueuedCount,
        failed: failedCount,
      });
    } catch (error) {
      logger.error('Failed to enqueue monthly digests', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Manually trigger monthly digest (for testing)
   */
  async triggerMonthlyDigest(): Promise<void> {
    logger.info('Manually triggering monthly digest');
    await this.enqueueMonthlyDigests();
  }
}

// Export singleton instance
export const cronManager = new CronManager();
