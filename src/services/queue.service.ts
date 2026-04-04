import { Job, JobsOptions } from 'bullmq';
import {
  getQueue,
  QUEUE_NAMES,
  ProcessReportJobData,
  UpdateLHMJobData,
  GenerateEmbeddingsJobData,
  SendDigestJobData,
  QueueName,
  getQueueHealth,
} from '../lib/queue';

/**
 * Queue Service - High-level interface for job queue operations
 */
export class QueueService {
  /**
   * Enqueue a report processing job
   */
  async enqueueProcessReport(data: ProcessReportJobData, options?: JobsOptions): Promise<Job> {
    const queue = getQueue(QUEUE_NAMES.PROCESS_REPORT);

    const job = await queue.add('process-report', data, {
      ...options,
      jobId: `process-report-${data.reportId}`,
      removeOnComplete: true,
      removeOnFail: false,
    });

    console.log(`Enqueued process-report job ${job.id} for report ${data.reportId}`);
    return job;
  }

  /**
   * Enqueue an LHM update job
   */
  async enqueueUpdateLHM(data: UpdateLHMJobData, options?: JobsOptions): Promise<Job> {
    const queue = getQueue(QUEUE_NAMES.UPDATE_LHM);

    const job = await queue.add('update-lhm', data, {
      ...options,
      jobId: `update-lhm-${data.profileId}-${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: false,
    });

    console.log(`Enqueued update-lhm job ${job.id} for profile ${data.profileId}`);
    return job;
  }

  /**
   * Enqueue an embeddings generation job
   */
  async enqueueGenerateEmbeddings(
    data: GenerateEmbeddingsJobData,
    options?: JobsOptions
  ): Promise<Job> {
    const queue = getQueue(QUEUE_NAMES.GENERATE_EMBEDDINGS);

    const job = await queue.add('generate-embeddings', data, {
      ...options,
      jobId: `generate-embeddings-${data.reportId}`,
      removeOnComplete: true,
      removeOnFail: false,
    });

    console.log(`Enqueued generate-embeddings job ${job.id} for report ${data.reportId}`);
    return job;
  }

  /**
   * Enqueue a digest email job
   */
  async enqueueSendDigest(data: SendDigestJobData, options?: JobsOptions): Promise<Job> {
    const queue = getQueue(QUEUE_NAMES.SEND_DIGEST);

    const job = await queue.add('send-digest', data, {
      ...options,
      jobId: `send-digest-${data.userId}-${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: false,
    });

    console.log(`Enqueued send-digest job ${job.id} for user ${data.userId}`);
    return job;
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(
    queueName: QueueName,
    jobId: string
  ): Promise<{
    id: string;
    state: string;
    progress: number | object | string | boolean;
    returnValue?: any;
    failedReason?: string;
    attemptsMade: number;
    data: any;
  } | null> {
    const queue = getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id!,
      state,
      progress: job.progress,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      data: job.data,
    };
  }

  /**
   * Get all jobs in a queue with their states
   */
  async getQueueJobs(
    queueName: QueueName,
    state?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  ) {
    const queue = getQueue(queueName);

    if (state) {
      return queue.getJobs([state]);
    }

    // Get all jobs from all states
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getJobs(['waiting']),
      queue.getJobs(['active']),
      queue.getJobs(['completed']),
      queue.getJobs(['failed']),
      queue.getJobs(['delayed']),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new Error(`Job ${jobId} is not in failed state (current state: ${state})`);
    }

    await job.retry();
    console.log(`Retrying job ${jobId} in queue ${queueName}`);
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.remove();
    console.log(`Removed job ${jobId} from queue ${queueName}`);
  }

  /**
   * Get queue statistics and health
   */
  async getQueueStats(queueName: QueueName) {
    const health = await getQueueHealth(queueName);
    const queue = getQueue(queueName);

    // Get failed jobs for error analysis
    const failedJobs = await queue.getFailed(0, 10);
    const recentErrors = failedJobs.map((job) => ({
      id: job.id,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.finishedOn,
    }));

    return {
      ...health,
      recentErrors,
    };
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(
    queueName: QueueName,
    grace: number = 24 * 3600 * 1000, // 24 hours in ms
    limit: number = 1000
  ): Promise<string[]> {
    const queue = getQueue(queueName);

    // Clean completed jobs older than grace period
    const completedJobs = await queue.clean(grace, limit, 'completed');

    // Clean failed jobs older than 7 days
    const failedJobs = await queue.clean(7 * 24 * 3600 * 1000, limit, 'failed');

    console.log(
      `Cleaned ${completedJobs.length} completed and ${failedJobs.length} failed jobs from ${queueName}`
    );

    return [...completedJobs, ...failedJobs];
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = getQueue(queueName);
    await queue.pause();
    console.log(`Paused queue ${queueName}`);
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = getQueue(queueName);
    await queue.resume();
    console.log(`Resumed queue ${queueName}`);
  }

  /**
   * Get all queue names and their health status
   */
  async getAllQueuesStatus() {
    const queueNames = Object.values(QUEUE_NAMES);

    const statuses = await Promise.all(
      queueNames.map(async (queueName) => {
        const stats = await this.getQueueStats(queueName);
        return {
          name: queueName,
          ...stats,
        };
      })
    );

    return statuses;
  }

  /**
   * Drain queue - remove all jobs
   */
  async drainQueue(queueName: QueueName): Promise<void> {
    const queue = getQueue(queueName);
    await queue.drain();
    console.log(`Drained all jobs from queue ${queueName}`);
  }

  /**
   * Obliterate queue - completely remove queue and all its data
   */
  async obliterateQueue(queueName: QueueName): Promise<void> {
    const queue = getQueue(queueName);
    await queue.obliterate();
    console.log(`Obliterated queue ${queueName}`);
  }
}

// Export singleton instance
export const queueService = new QueueService();
