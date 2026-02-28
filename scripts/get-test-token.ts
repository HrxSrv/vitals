import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

/**
 * Script to get a test auth token
 * Usage: tsx scripts/get-test-token.ts <email> <password>
 */

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: tsx scripts/get-test-token.ts <email> <password>');
  console.error('Example: tsx scripts/get-test-token.ts test@example.com password123');
  process.exit(1);
}

async function getToken() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  console.log('Attempting to sign in...');
  
  // Try to sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.log('Sign in failed, attempting to sign up...');
    
    // If sign in fails, try to sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message);
      process.exit(1);
    }

    if (!signUpData.session) {
      console.log('✅ Sign up successful! Please check your email to confirm your account.');
      console.log('   After confirming, run this script again to get your token.');
      process.exit(0);
    }

    console.log('✅ Sign up successful!');
    console.log('\n📋 Your access token:');
    console.log(signUpData.session.access_token);
    console.log('\n📋 User ID:', signUpData.user?.id);
    console.log('\n💡 Token expires at:', new Date(signUpData.session.expires_at! * 1000).toISOString());
    
    return;
  }

  console.log('✅ Sign in successful!');
  console.log('\n📋 Your access token:');
  console.log(signInData.session.access_token);
  console.log('\n📋 User ID:', signInData.user.id);
  console.log('\n💡 Token expires at:', new Date(signInData.session.expires_at! * 1000).toISOString());
  console.log('\n💡 Copy this token and use it in your API requests!');
}

getToken().catch(console.error);
