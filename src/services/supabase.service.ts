import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Lazy initialization to ensure environment variables are loaded
let _supabaseAdmin: SupabaseClient<Database> | null = null;

/**
 * Supabase client for backend operations using service role key
 * This client bypasses Row Level Security (RLS) policies
 */
export const supabaseAdmin: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error(
          'Missing Supabase environment variables. Please check your .env file contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        );
      }

      _supabaseAdmin = createClient<Database>(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }
    return _supabaseAdmin[prop as keyof SupabaseClient<Database>];
  },
});

/**
 * Create a Supabase client for user-specific operations with RLS
 * This client respects Row Level Security policies
 *
 * @param accessToken - User's Supabase access token from Authorization header
 * @returns Supabase client configured for the authenticated user
 */
export function createUserSupabaseClient(accessToken: string): SupabaseClient<Database> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env file contains SUPABASE_URL and SUPABASE_ANON_KEY'
    );
  }

  return createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Verify Supabase connection and configuration
 * Should be called on application startup
 */
export async function verifySupabaseConnection(): Promise<void> {
  try {
    // Test connection by querying a simple table
    const { error } = await supabaseAdmin
      .from('biomarker_definitions')
      .select('name_normalized')
      .limit(1);

    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    console.log('✓ Supabase connection verified');
  } catch (error) {
    console.error('✗ Supabase connection failed:', error);
    throw error;
  }
}

export default supabaseAdmin;
