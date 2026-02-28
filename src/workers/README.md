# Background Workers

This directory contains BullMQ background workers for asynchronous task processing.

## Workers

### Process Report Worker (`process-report.worker.ts`)

Orchestrates the complete report processing pipeline:

1. **Fetch Report**: Retrieves report record and PDF from storage
2. **OCR Extraction**: Calls Mistral OCR API to extract text from PDF
3. **Store OCR**: Saves raw OCR markdown in report record
4. **Extract Biomarkers**: Uses LLM with structured output to extract biomarker data
5. **Normalize Names**: Maps biomarker names to canonical forms using aliases + LLM fallback
6. **Store Biomarkers**: Saves normalized biomarkers to database
7. **Trigger LHM Update**: Enqueues job to update Living Health Markdown
8. **Update Status**: Sets report status to "done" or "failed"

**Configuration:**
- Concurrency: 3 (processes up to 3 reports simultaneously)
- Retries: 3 attempts with exponential backoff (10s, 20s, 40s)
- Timeout: None (OCR can take time for large PDFs)

**Error Handling:**
- OCR failures: Retried 3 times with exponential backoff
- LLM failures: Retried 3 times with exponential backoff
- Job failures: Retried 3 times by BullMQ
- Status updates: Report marked as "failed" on permanent failure

**Monitoring:**
- Progress updates at each step (10%, 20%, 30%, etc.)
- Detailed logging at each stage
- Failed jobs retained for 7 days for debugging

## Worker Lifecycle

Workers are automatically started when the application starts via `src/workers/index.ts`.

### Starting Workers

Workers start automatically with the server:

```bash
pnpm dev    # Development mode with auto-reload
pnpm start  # Production mode
```

### Testing Workers

```bash
# Test worker initialization
pnpm test:worker

# Test queue connectivity
pnpm test:queue

# Monitor queue status
pnpm test:redis
```

### Monitoring Workers

Use the queue service to monitor worker status:

```typescript
import { queueService } from './services/queue.service';

// Get queue statistics
const stats = await queueService.getQueueStats('process-report');
console.log(stats);

// Get job status
const job = await queueService.getJobStatus('process-report', 'job-id');
console.log(job);

// Get all jobs
const jobs = await queueService.getQueueJobs('process-report');
console.log(jobs);
```

## Adding New Workers

1. Create worker file: `src/workers/my-worker.worker.ts`
2. Implement job processor function
3. Create worker using `createWorker` from `src/lib/queue.ts`
4. Export worker instance
5. Import worker in `src/workers/index.ts`
6. Add job data type to `src/lib/queue.ts`
7. Add enqueue method to `src/services/queue.service.ts`

Example:

```typescript
// src/workers/my-worker.worker.ts
import { Job } from 'bullmq';
import { createWorker, MyJobData } from '../lib/queue';
import { logger } from '../utils/logger';

async function processMyJob(job: Job<MyJobData>): Promise<void> {
  const { data } = job.data;
  
  logger.info('Processing my job', { data });
  
  try {
    // Do work here
    await job.updateProgress(50);
    
    // More work
    await job.updateProgress(100);
    
    logger.info('Job completed', { data });
  } catch (error) {
    logger.error('Job failed', { error });
    throw error; // Trigger retry
  }
}

export const myWorker = createWorker('my-queue', processMyJob, {
  concurrency: 5,
});

logger.info('My worker started');
```

## Best Practices

1. **Idempotency**: Workers should be idempotent - running the same job multiple times should produce the same result
2. **Progress Updates**: Update job progress regularly for monitoring
3. **Error Handling**: Always catch and log errors, then re-throw to trigger retries
4. **Logging**: Log at each major step with relevant context
5. **Timeouts**: Set appropriate timeouts for long-running operations
6. **Retries**: Use exponential backoff for external service calls
7. **Cleanup**: Clean up resources (files, connections) in finally blocks
8. **Testing**: Test workers with mock data before deploying

## Troubleshooting

### Worker Not Processing Jobs

1. Check Redis connection: `pnpm test:redis`
2. Check queue status: `pnpm test:queue`
3. Verify worker is imported in `src/workers/index.ts`
4. Check logs for errors

### Jobs Failing Repeatedly

1. Check job error logs: `queueService.getQueueStats('queue-name')`
2. Verify external service connectivity (Mistral API, Supabase)
3. Check environment variables
4. Review retry configuration

### High Memory Usage

1. Reduce worker concurrency
2. Implement job batching
3. Add memory limits to worker options
4. Clean up old jobs: `queueService.cleanQueue('queue-name')`

### Slow Processing

1. Increase worker concurrency
2. Optimize external API calls
3. Add caching where appropriate
4. Profile slow operations

## Environment Variables

Required environment variables for workers:

```env
# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Mistral AI
MISTRAL_API_KEY=your_api_key

# Supabase
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Related Documentation

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Queue Service](../services/queue.service.ts)
- [Queue Configuration](../lib/queue.ts)
- [Retry Utility](../utils/retry.ts)
