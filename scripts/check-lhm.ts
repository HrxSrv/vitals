import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from '../src/services/supabase.service';

/**
 * Script to check LHM documents for profiles
 */

async function checkLHM() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: npx tsx scripts/check-lhm.ts <user_id>');
    console.error('Example: npx tsx scripts/check-lhm.ts 5f9f3765-a10c-44e0-9c25-a2e56ca3ca82');
    process.exit(1);
  }

  console.log(`\n🔍 Checking LHM documents for user: ${userId}\n`);

  // Get profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId);

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
    process.exit(1);
  }

  console.log(`Found ${profiles?.length || 0} profiles:\n`);

  for (const profile of profiles || []) {
    console.log(`📋 Profile: ${profile.name} (${profile.relationship})`);
    console.log(`   ID: ${profile.id}`);

    // Get LHM
    const { data: lhm, error: lhmError } = await supabaseAdmin
      .from('user_health_markdown')
      .select('*')
      .eq('profile_id', profile.id)
      .single();

    if (lhmError) {
      if (lhmError.code === 'PGRST116') {
        console.log('   ❌ No LHM document found\n');
      } else {
        console.log(`   ❌ Error fetching LHM: ${lhmError.message}\n`);
      }
      continue;
    }

    console.log(`   ✅ LHM exists`);
    console.log(`   Version: ${lhm.version}`);
    console.log(`   Tokens: ${lhm.tokens_approx}`);
    console.log(`   Markdown length: ${lhm.markdown.length} chars`);
    console.log(`   Last updated: ${lhm.last_updated_at}`);
    console.log(`\n   Preview (first 200 chars):`);
    console.log(`   ${lhm.markdown.substring(0, 200)}...\n`);
  }
}

checkLHM().catch(console.error);
