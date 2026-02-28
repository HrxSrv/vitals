import { Job } from 'bullmq';
import { createWorker, SendDigestJobData } from '../lib/queue';
import { digestService } from '../services/digest.service';
import { notificationRepository } from '../repositories/notification.repository';
import { supabaseAdmin } from '../services/supabase.service';
import { logger } from '../utils/logger';

/**
 * Send Digest Worker
 * Processes jobs to send monthly health digest emails
 * 
 * Job data:
 * - userId: User ID to send digest to
 */
async function sendDigestJob(
  job: Job<SendDigestJobData>
): Promise<void> {
  const { userId } = job.data;

  logger.info('Processing send-digest job', {
    jobId: job.id,
    userId,
  });

  try {
    // Get user email from Supabase Auth
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      userId
    );

    if (userError || !user) {
      logger.error('Failed to fetch user for digest', {
        userId,
        error: userError?.message,
      });
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.user.email) {
      logger.warn('User has no email address, skipping digest', { userId });
      return;
    }

    // Generate and send digest
    await digestService.generateAndSendDigest(
      userId,
      user.user.email,
      user.user.user_metadata?.name || user.user.email.split('@')[0]
    );

    // Update last sent timestamp
    await notificationRepository.updateLastSent(userId);

    logger.info('Send-digest job completed successfully', {
      jobId: job.id,
      userId,
      email: user.user.email,
    });
  } catch (error) {
    logger.error('Send-digest job failed', {
      jobId: job.id,
      userId,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error; // Re-throw to trigger retry
  }
}

// Create and start the worker
export const sendDigestWorker = createWorker(
  'send-digest',
  sendDigestJob,
  {
    concurrency: 3, // Process up to 3 digest emails concurrently
  }
);

logger.info('Send digest worker started');
