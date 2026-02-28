/**
 * End-to-End Test Script
 * Tests the complete flow from report upload to dashboard retrieval
 * 
 * Flow:
 * 1. Create test user and profile
 * 2. Upload test_report.pdf
 * 3. Wait for OCR processing
 * 4. Wait for biomarker extraction
 * 5. Wait for LHM generation
 * 6. Verify dashboard data
 * 7. Test chat Q&A
 * 8. Cleanup
 */

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../services/supabase.service';
import { reportService } from '../services/report.service';
import { dashboardService } from '../services/dashboard.service';
import { chatService } from '../services/chat.service';
import { reportRepository } from '../repositories/report.repository';
import { biomarkerRepository } from '../repositories/biomarker.repository';
import { lhmRepository } from '../repositories/lhm.repository';
import profileRepository from '../repositories/profile.repository';
import { logger } from '../utils/logger';

// Test configuration
const TEST_USER_EMAIL = 'test-e2e@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_REPORT_PATH = path.join(process.cwd(), 'test_report.pdf');
const TEST_OUTPUT_PATH = path.join(process.cwd(), 'e2e-test-results.json');

// Polling configuration
const MAX_WAIT_TIME = 300000; // 5 minutes
const POLL_INTERVAL = 2000; // 2 seconds

interface TestContext {
  userId: string;
  profileId: string;
  reportId: string;
}

interface TestResults {
  timestamp: string;
  success: boolean;
  steps: {
    userCreation: { success: boolean; userId?: string; error?: string };
    profileCreation: { success: boolean; profileId?: string; error?: string };
    reportUpload: { success: boolean; reportId?: string; fileSize?: number; error?: string };
    reportProcessing: { success: boolean; duration?: number; error?: string };
    biomarkerExtraction: { success: boolean; count?: number; error?: string };
    lhmGeneration: { success: boolean; version?: number; error?: string };
    dashboardVerification: { success: boolean; data?: any; error?: string };
    chatTesting: { success: boolean; responses?: any[]; error?: string };
  };
  totalDuration: number;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForReportProcessing(reportId: string): Promise<void> {
  console.log('⏳ Waiting for report processing...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const report = await reportRepository.findById(reportId);
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    console.log(`   Status: ${report.processingStatus}`);
    
    if (report.processingStatus === 'done') {
      console.log('✅ Report processing completed');
      return;
    }
    
    if (report.processingStatus === 'failed') {
      throw new Error('Report processing failed');
    }
    
    await sleep(POLL_INTERVAL);
  }
  
  throw new Error('Report processing timeout');
}

async function waitForBiomarkers(reportId: string): Promise<number> {
  console.log('⏳ Waiting for biomarker extraction...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const biomarkers = await biomarkerRepository.findByReport(reportId);
    
    if (biomarkers.length > 0) {
      console.log(`✅ Found ${biomarkers.length} biomarkers`);
      return biomarkers.length;
    }
    
    await sleep(POLL_INTERVAL);
  }
  
  throw new Error('Biomarker extraction timeout');
}

async function waitForLHM(profileId: string): Promise<number> {
  console.log('⏳ Waiting for LHM generation...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const lhm = await lhmRepository.findByProfileId(profileId);
    
    if (lhm && lhm.version > 1) {
      console.log(`✅ LHM generated (version ${lhm.version})`);
      return lhm.version;
    }
    
    await sleep(POLL_INTERVAL);
  }
  
  throw new Error('LHM generation timeout');
}

async function createTestUser(): Promise<string> {
  console.log('\n📝 Step 1: Creating test user...');
  
  // First, try to get existing user
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    throw listError;
  }
  
  let user = users.find(u => u.email === TEST_USER_EMAIL);
  
  // If user doesn't exist, create it
  if (!user) {
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    });
    
    if (signUpError) {
      throw signUpError;
    }
    
    user = signUpData.user;
  }
  
  if (!user) {
    throw new Error('User not found after creation');
  }
  
  console.log(`✅ User created/found: ${user.id}`);
  return user.id;
}

async function createTestProfile(userId: string): Promise<string> {
  console.log('\n📝 Step 2: Creating test profile...');
  
  // Check if profile already exists
  const existingProfiles = await profileRepository.findByUserId(userId);
  
  if (existingProfiles.length > 0) {
    console.log(`✅ Using existing profile: ${existingProfiles[0].id}`);
    return existingProfiles[0].id;
  }
  
  // Create new profile
  const profile = await profileRepository.create(userId, {
    name: 'Test User',
    relationship: 'self',
    dob: '1990-01-01',
    gender: 'male',
    isDefault: true,
  });
  
  console.log(`✅ Profile created: ${profile.id}`);
  return profile.id;
}

async function uploadTestReport(userId: string, profileId: string): Promise<string> {
  console.log('\n📝 Step 3: Uploading test report...');
  
  // Check if file exists
  if (!fs.existsSync(TEST_REPORT_PATH)) {
    throw new Error(`Test report not found at: ${TEST_REPORT_PATH}`);
  }
  
  // Read file
  const fileBuffer = fs.readFileSync(TEST_REPORT_PATH);
  console.log(`   File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
  
  // Upload report
  const report = await reportService.uploadReport(
    userId,
    profileId,
    fileBuffer,
    'test_report.pdf',
    new Date()
  );
  
  console.log(`✅ Report uploaded: ${report.id}`);
  console.log(`   Status: ${report.processingStatus}`);
  
  return report.id;
}

async function verifyDashboard(userId: string, profileId: string): Promise<any> {
  console.log('\n📝 Step 4: Verifying dashboard data...');
  
  const dashboard = await dashboardService.getDashboard(userId, profileId);
  
  console.log('✅ Dashboard data retrieved:');
  console.log(`   Profile: ${dashboard.profile.name}`);
  console.log(`   Total reports: ${dashboard.totalReports}`);
  console.log(`   Latest biomarkers: ${dashboard.latestBiomarkers.length}`);
  console.log(`   LHM version: ${dashboard.lhm.version}`);
  console.log(`   LHM tokens: ${dashboard.lhm.tokensApprox || 'N/A'}`);
  
  if (dashboard.latestBiomarkers.length > 0) {
    console.log('\n   Sample biomarkers:');
    dashboard.latestBiomarkers.slice(0, 5).forEach(b => {
      console.log(`   - ${b.name}: ${b.value} ${b.unit} (${b.status})`);
    });
  }
  
  // Show LHM preview
  console.log('\n   LHM Preview (first 500 chars):');
  console.log('   ' + dashboard.lhm.markdown.substring(0, 500).replace(/\n/g, '\n   '));
  
  return dashboard;
}

async function testChat(userId: string, profileId: string): Promise<any[]> {
  console.log('\n📝 Step 5: Testing chat Q&A...');
  
  const questions = [
    'What is my latest blood sugar level?',
    'Are there any concerning values in my report?',
    'What is my cholesterol status?',
  ];
  
  const responses = [];
  
  for (const question of questions) {
    console.log(`\n   Q: ${question}`);
    console.log('   A: ', { newline: false });
    
    try {
      let response = '';
      for await (const chunk of chatService.chat(userId, question, { profileId })) {
        response += chunk;
        process.stdout.write(chunk);
      }
      console.log('\n');
      
      if (response.length === 0) {
        console.log('   ⚠️  Empty response');
      }
      
      responses.push({ question, response, success: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`\n   ❌ Error: ${errorMsg}`);
      responses.push({ question, error: errorMsg, success: false });
    }
  }
  
  return responses;
}

async function cleanup(context: Partial<TestContext>): Promise<void> {
  console.log('\n🧹 Cleanup...');
  
  try {
    if (context.profileId) {
      // Delete profile (cascades to reports, biomarkers, LHM)
      await profileRepository.delete(context.profileId);
      console.log('✅ Profile deleted');
    }
    
    // Note: We don't delete the user to avoid auth issues
    // You can manually delete from Supabase dashboard if needed
    
  } catch (error) {
    console.log(`⚠️  Cleanup error: ${error instanceof Error ? error.message : error}`);
  }
}

async function runE2ETest(): Promise<void> {
  console.log('🚀 Starting End-to-End Test');
  console.log('═══════════════════════════════════════\n');
  
  const startTime = Date.now();
  const context: Partial<TestContext> = {};
  const results: TestResults = {
    timestamp: new Date().toISOString(),
    success: false,
    steps: {
      userCreation: { success: false },
      profileCreation: { success: false },
      reportUpload: { success: false },
      reportProcessing: { success: false },
      biomarkerExtraction: { success: false },
      lhmGeneration: { success: false },
      dashboardVerification: { success: false },
      chatTesting: { success: false },
    },
    totalDuration: 0,
  };
  
  try {
    // Step 1: Create test user
    const userStartTime = Date.now();
    context.userId = await createTestUser();
    results.steps.userCreation = { 
      success: true, 
      userId: context.userId 
    };
    
    // Step 2: Create test profile
    const profileStartTime = Date.now();
    context.profileId = await createTestProfile(context.userId);
    results.steps.profileCreation = { 
      success: true, 
      profileId: context.profileId 
    };
    
    // Step 3: Upload test report
    const uploadStartTime = Date.now();
    context.reportId = await uploadTestReport(context.userId, context.profileId);
    const fileSize = fs.statSync(TEST_REPORT_PATH).size;
    results.steps.reportUpload = { 
      success: true, 
      reportId: context.reportId,
      fileSize 
    };
    
    // Wait for processing
    const processingStartTime = Date.now();
    await waitForReportProcessing(context.reportId);
    results.steps.reportProcessing = { 
      success: true, 
      duration: Date.now() - processingStartTime 
    };
    
    const biomarkers = await waitForBiomarkers(context.reportId);
    results.steps.biomarkerExtraction = { 
      success: true, 
      count: biomarkers 
    };
    
    const lhmVersion = await waitForLHM(context.profileId);
    results.steps.lhmGeneration = { 
      success: true, 
      version: lhmVersion 
    };
    
    // Step 4: Verify dashboard
    const dashboard = await verifyDashboard(context.userId, context.profileId);
    results.steps.dashboardVerification = { 
      success: true, 
      data: {
        profileName: dashboard.profile.name,
        totalReports: dashboard.totalReports,
        biomarkerCount: dashboard.latestBiomarkers.length,
        lhmVersion: dashboard.lhm.version,
        lhmTokens: dashboard.lhm.tokensApprox,
      }
    };
    
    // Step 5: Test chat
    const chatResponses = await testChat(context.userId, context.profileId);
    results.steps.chatTesting = { 
      success: true, 
      responses: chatResponses 
    };
    
    results.success = true;
    results.totalDuration = Date.now() - startTime;
    
    // Save results
    fs.writeFileSync(TEST_OUTPUT_PATH, JSON.stringify(results, null, 2));
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ End-to-End Test PASSED');
    console.log(`⏱️  Total duration: ${(results.totalDuration / 1000).toFixed(2)}s`);
    console.log(`📄 Results saved to: ${TEST_OUTPUT_PATH}`);
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    results.success = false;
    results.error = error instanceof Error ? error.message : String(error);
    results.totalDuration = Date.now() - startTime;
    
    // Save results even on failure
    fs.writeFileSync(TEST_OUTPUT_PATH, JSON.stringify(results, null, 2));
    
    console.error('\n═══════════════════════════════════════');
    console.error('❌ End-to-End Test FAILED');
    console.error('═══════════════════════════════════════');
    console.error('\nError:', error);
    console.error('\nStack:', error instanceof Error ? error.stack : 'N/A');
    console.error(`\n📄 Results saved to: ${TEST_OUTPUT_PATH}`);
    
    process.exit(1);
  } finally {
    // Cleanup
    await cleanup(context);
  }
}

// Run test
runE2ETest().catch(console.error);
