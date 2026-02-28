/**
 * Worker initialization
 * 
 * This file imports and starts all background workers.
 * Workers should be imported here to ensure they are initialized when the application starts.
 */

import { logger } from '../utils/logger';

// Import workers to start them
import './process-report.worker';
import './update-lhm.worker';
import './generate-embeddings.worker';
import './send-digest.worker';

logger.info('All workers initialized');

export {};
