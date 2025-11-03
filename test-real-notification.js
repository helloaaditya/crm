/**
 * Test Real Notification - Simulate a real notification trigger
 * 
 * This script simulates what happens when a real event occurs
 * (like expense approval, leave approval, etc.)
 * 
 * Usage: node test-real-notification.js <userId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createNotification } from './controllers/notificationController.js';

dotenv.config();

const testRealNotification = async () => {
  try {
    console.log('🧪 Testing Real Notification Flow\n');
    console.log('═'.repeat(50));
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get userId from command line or use a default
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('❌ Please provide a userId as argument:');
      console.error('   node test-real-notification.js <userId>\n');
      console.error('💡 Tip: Check MongoDB users collection for valid user IDs');
      process.exit(1);
    }
    
    console.log(`👤 Testing with User ID: ${userId}\n`);
    console.log('═'.repeat(50));
    console.log('\n🔔 Creating test notification...\n');
    
    // Create a test notification (simulates real event)
    const notification = await createNotification({
      recipient: userId,
      type: 'test_real_notification',
      title: '🧪 Test Real Notification',
      message: 'This is a test notification simulating a real event like expense approval or leave approval. If you receive this on your mobile device, real notifications are working!',
      actionUrl: '/notifications',
      priority: 'high',
      triggeredBy: userId // Self-triggered for testing
    });
    
    if (notification) {
      console.log('\n✅ Notification created successfully!');
      console.log('   Notification ID:', notification._id);
      console.log('\n📱 Check your mobile device - you should receive a push notification!');
      console.log('\n💡 If you received it, real notifications are working.');
      console.log('💡 If not, check the server logs above for errors.');
    } else {
      console.log('\n❌ Failed to create notification');
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('🏁 Test complete!\n');
    
    // Close connection
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testRealNotification();

