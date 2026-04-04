import { Queue, QueueOptions, Worker, WorkerOptions, Job } from 'bullmq';
import { getRedisClient } from './redis';

// Queue names
export const QUEUE_NAMES = {
  PROCESS_REPORT: 'process-report',
  UPDATE_LHM: 'update-lhm',
  GENERATE_EMBEDDINGS: 'generate-embeddings',
  SEND_DIGEST: 'send-digest',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job data types
export interface ProcessReportJobData {
  reportId: string;
  userId: string;
  profileId: string;
}

export interface UpdateLHMJobData {
  profileId: string;
  userId: string;
  reportId: string;
}

export interface GenerateEmbeddingsJobData {
  reportId: string;
  userId: string;
  profileId: string;
}

export interface SendDigestJobData {
  userId: string;
}

// Function to get queue options (lazy initialization)
function getDefaultQueueOptions(): QueueOptions {
  return {
    connection: getRedisClient() as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000, // Start with 10 seconds
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        count: 5000, // Keep last 5000 failed jobs
      },
    },
  };
}

// Worker configuration with concurrency limits
const defaultWorkerOptions: Omit<WorkerOptions, 'connection'> = {
  concurrency: 5, // Process up to 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // Per second
  },
};

// Queue instances
const queues = new Map<QueueName, Queue>();

/**
 * Get or create a queue instance
 */
export function getQueue(queueName: QueueName): Queue {
  if (!queues.has(queueName)) {
    const queue = new Queue(queueName, getDefaultQueueOptions());
    queues.set(queueName, queue);

    // Set up queue event listeners
    queue.on('error', (error) => {
      console.error(`Queue ${queueName} error:`, error);
    });
  }

  return queues.get(queueName)!;
}

/**
 * Create a worker for a specific queue
 */
export function createWorker<T = any>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<any>,
  options?: Partial<WorkerOptions>
): Worker {
  const workerOptions: WorkerOptions = {
    ...defaultWorkerOptions,
    ...options,
    connection: getRedisClient() as any,
  };

  const worker = new Worker(queueName, processor, workerOptions);

  // Set up worker event listeners
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} in queue ${queueName} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} in queue ${queueName} failed:`, error);
  });

  worker.on('error', (error) => {
    console.error(`Worker for queue ${queueName} error:`, error);
  });

  return worker;
}

/**
 * Close all queues and clean up
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((queue) => queue.close());
  await Promise.all(closePromises);
  queues.clear();
}

/**
 * Get queue health status
 */
export async function getQueueHealth(queueName: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}
