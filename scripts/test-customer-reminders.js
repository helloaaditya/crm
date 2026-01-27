import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { checkAndSendNewCustomerReminders } from '../utils/customerReminderService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanjana_crm';

async function testReminders() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get an admin user for createdBy field
    const testUser = await User.findOne({ role: { $in: ['main_admin', 'admin'] } });
    
    if (!testUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`👤 Using admin user: ${testUser.name} (${testUser.email})\n`);

    // Create a test customer with old date (3 days ago = 72 hours)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(threeDaysAgo.getHours() - 12); // Make it 3.5 days ago to be safe

    // Generate unique contact number
    const uniqueNumber = `9999${Date.now().toString().slice(-6)}`;

    console.log('📝 Creating test customer...');
    const testCustomer = await Customer.create({
      name: 'Test Customer - Reminder Check',
      contactNumber: uniqueNumber,
      email: 'testcustomer@example.com',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      leadStatus: 'new',
      isActive: true,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
      createdBy: testUser._id,
      notes: 'This is a test customer for reminder system testing'
    });

    console.log(`✅ Created test customer: ${testCustomer.customerId}`);
    console.log(`   Name: ${testCustomer.name}`);
    console.log(`   Contact: ${testCustomer.contactNumber}`);
    console.log(`   Created at: ${testCustomer.createdAt.toLocaleString()}`);
    console.log(`   Status: ${testCustomer.leadStatus}`);
    console.log(`   Age: ${Math.floor((new Date() - testCustomer.createdAt) / (1000 * 60 * 60))} hours\n`);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger reminder check
    console.log('🔔 Triggering reminder check...\n');
    const result = await checkAndSendNewCustomerReminders();

    console.log('\n📊 Reminder Check Results:');
    console.log('='.repeat(50));
    console.log(`Success: ${result.success}`);
    console.log(`Customers Found: ${result.count || 0}`);
    console.log(`Emails Sent: ${result.emailsSent || 0}`);
    console.log(`Emails Failed: ${result.emailsFailed || 0}`);
    if (result.recipients) {
      console.log(`Recipients: ${result.recipients.join(', ')}`);
    }
    console.log(`Message: ${result.message || 'N/A'}`);
    console.log('='.repeat(50));

    // Ask user if they want to keep the test customer
    console.log('\n💡 Test customer created:');
    console.log(`   Customer ID: ${testCustomer.customerId}`);
    console.log(`   Contact: ${testCustomer.contactNumber}`);
    console.log('\n⚠️  To delete this test customer, run:');
    console.log(`   db.customers.deleteOne({ customerId: "${testCustomer.customerId}" })`);
    console.log('   Or delete it via the CRM interface.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted. Closing MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

testReminders();
