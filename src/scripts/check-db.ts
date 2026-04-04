#!/usr/bin/env tsx

/**
 * Database health check script
 *
 * Usage:
 *   pnpm tsx src/scripts/check-db.ts
 */

import 'dotenv/config';
import { printDatabaseStatus } from '../utils/db-health';

async function main() {
  try {
    await printDatabaseStatus();
    process.exit(0);
  } catch (error) {
    console.error('Error checking database:', error);
    process.exit(1);
  }
}

main();
