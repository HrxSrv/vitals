import '../env';
import { storageService } from '../services/storage.service';
import { logger } from '../utils/logger';

/**
 * Initialize Supabase storage bucket
 * Run: pnpm tsx src/scripts/init-storage.ts
 */

async function initStorage() {
  try {
    console.log('🚀 Initializing Supabase storage bucket...\n');

    await storageService.initializeBucket();

    console.log('\n✅ Storage initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Storage initialization failed:', error);
    logger.error('Storage initialization failed', { error });
    process.exit(1);
  }
}

initStorage();
