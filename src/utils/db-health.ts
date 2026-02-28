import { supabaseAdmin } from '../services/supabase.service';

/**
 * Validate environment variables
 */
function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  return { valid: missing.length === 0, missing };
}

/**
 * Check database health and connectivity
 * Returns detailed information about database status
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  tablesExist: boolean;
  biomarkerCount: number;
  error?: string;
}> {
  try {
    // Validate environment variables first
    const envCheck = validateEnvironment();
    if (!envCheck.valid) {
      return {
        connected: false,
        tablesExist: false,
        biomarkerCount: 0,
        error: `Missing environment variables: ${envCheck.missing.join(', ')}`,
      };
    }

    // Test basic connectivity
    const { error: biomarkerError } = await supabaseAdmin
      .from('biomarker_definitions')
      .select('name_normalized')
      .limit(1);

    if (biomarkerError) {
      return {
        connected: false,
        tablesExist: false,
        biomarkerCount: 0,
        error: biomarkerError.message,
      };
    }

    // Count biomarker definitions
    const { count, error: countError } = await supabaseAdmin
      .from('biomarker_definitions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return {
        connected: true,
        tablesExist: true,
        biomarkerCount: 0,
        error: countError.message,
      };
    }

    return {
      connected: true,
      tablesExist: true,
      biomarkerCount: count || 0,
    };
  } catch (error) {
    return {
      connected: false,
      tablesExist: false,
      biomarkerCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify all required tables exist
 */
export async function verifyDatabaseSchema(): Promise<{
  valid: boolean;
  missingTables: string[];
}> {
  const requiredTables = [
    'users',
    'profiles',
    'reports',
    'biomarkers',
    'biomarker_definitions',
    'user_health_markdown',
    'lhm_history',
    'report_embeddings',
    'notification_prefs',
  ];

  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabaseAdmin
        .from(table as any)
        .select('*')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        missingTables.push(table);
      }
    } catch (error) {
      missingTables.push(table);
    }
  }

  return {
    valid: missingTables.length === 0,
    missingTables,
  };
}

/**
 * Print database health status to console
 */
export async function printDatabaseStatus(): Promise<void> {
  console.log('\n🔍 Checking database health...\n');

  // Check environment variables first
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    console.error('❌ Missing environment variables:', envCheck.missing.join(', '));
    console.log('\n💡 Make sure your .env file contains:');
    console.log('   SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    console.log('   SUPABASE_ANON_KEY=your-anon-key\n');
    return;
  }

  console.log('✅ Environment variables loaded');
  console.log(`   URL: ${process.env.SUPABASE_URL}`);

  const health = await checkDatabaseHealth();

  if (!health.connected) {
    console.error('❌ Database connection failed');
    console.error(`   Error: ${health.error}`);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your SUPABASE_URL is correct');
    console.log('   2. Verify SUPABASE_SERVICE_ROLE_KEY is valid');
    console.log('   3. Ensure migrations were applied: pnpm db:push');
    console.log('   4. Check Supabase dashboard for any issues\n');
    return;
  }

  console.log('✅ Database connected');

  if (!health.tablesExist) {
    console.error('❌ Required tables do not exist');
    console.log('\n💡 Run migrations: pnpm db:push\n');
    return;
  }

  console.log('✅ Tables exist');
  console.log(`✅ Biomarker definitions loaded: ${health.biomarkerCount}`);

  const schema = await verifyDatabaseSchema();
  if (!schema.valid) {
    console.error('❌ Missing tables:', schema.missingTables.join(', '));
    console.log('\n💡 Run migrations: pnpm db:push\n');
    return;
  }

  console.log('✅ All required tables present');
  console.log('\n✨ Database is ready!\n');
}
