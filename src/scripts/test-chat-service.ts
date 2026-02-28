/**
 * Test script for chat service
 * Tests the RAG-powered Q&A system
 */

import { chatService } from '../services/chat.service';
import { logger } from '../utils/logger';

async function testChatService() {
  console.log('=== Testing Chat Service ===\n');

  // Note: This requires a valid user ID and profiles in the database
  const testUserId = process.env.TEST_USER_ID || 'test-user-id';

  try {
    console.log('1. Testing basic chat with profile detection...');
    console.log('Question: "What is my health status?"\n');

    let response = '';
    for await (const chunk of chatService.chat(
      testUserId,
      'What is my health status?'
    )) {
      response += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n\n✓ Basic chat completed\n');
    console.log('Full response:', response);
    console.log('\n---\n');

    console.log('2. Testing chat with explicit profile...');
    console.log('Question: "What are the latest test results?"\n');

    response = '';
    for await (const chunk of chatService.chat(
      testUserId,
      'What are the latest test results?',
      {
        profileId: process.env.TEST_PROFILE_ID,
      }
    )) {
      response += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n\n✓ Chat with explicit profile completed\n');
    console.log('\n---\n');

    console.log('3. Testing chat with vector search...');
    console.log('Question: "What was my cholesterol level in the last report?"\n');

    response = '';
    for await (const chunk of chatService.chat(
      testUserId,
      'What was my cholesterol level in the last report?',
      {
        useVectorSearch: true,
        maxContextChunks: 3,
      }
    )) {
      response += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n\n✓ Chat with vector search completed\n');
    console.log('\n---\n');

    console.log('4. Testing profile detection with relationship keywords...');
    console.log('Question: "How is my mom\'s blood sugar?"\n');

    response = '';
    for await (const chunk of chatService.chat(
      testUserId,
      "How is my mom's blood sugar?"
    )) {
      response += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n\n✓ Profile detection with keywords completed\n');
    console.log('\n---\n');

    console.log('✅ All chat service tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Chat service test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testChatService()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
