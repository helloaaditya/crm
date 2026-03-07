/**
 * Test script for Employee Inactivity Report
 * Sends the report email to kulalp447@gmail.com for today (or a given date).
 *
 * Usage:
 *   node scripts/test-employee-inactivity-report.js
 *   node scripts/test-employee-inactivity-report.js 2025-01-27
 *
 * Requires: .env with MONGODB_URI and email config (EMAIL_USER, EMAIL_PASSWORD, etc.)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { checkAndSendEmployeeInactivityReport } from '../utils/employeeInactivityReminderService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanjana_crm';

function maskUri(uri) {
  if (!uri || uri.startsWith('mongodb://localhost')) return uri;
  try {
    const u = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    return u.replace(/(\.mongodb\.net\/[^?]*)/, '.mongodb.net/***');
  } catch (_) { return '(set)'; }
}

async function run() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log('   URI:', maskUri(MONGODB_URI));
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const dateArg = process.argv[2]; // optional YYYY-MM-DD
    const forDate = dateArg ? new Date(dateArg) : new Date();
    const dateStr = forDate.toISOString().split('T')[0];

    console.log('📅 Report date:', dateStr, dateArg ? '' : '(today)\n');
    console.log('📧 Recipient: kulalp447@gmail.com');
    console.log('🔔 Running employee inactivity check...\n');

    const result = await checkAndSendEmployeeInactivityReport(forDate);

    console.log('\n📊 Result:');
    console.log('─'.repeat(50));
    console.log('Success:', result.success);
    console.log('Count (no activity):', result.count ?? 0);
    if (result.recipient) console.log('Sent to:', result.recipient);
    console.log('Message:', result.message || 'N/A');
    if (result.skipped) console.log('⚠️  Email skipped (not configured)');
    if (result.error) console.log('Error:', result.error);
    console.log('─'.repeat(50));

    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('querySrv'))) {
      console.error('\n💡 This is a network/DNS error: this machine cannot reach MongoDB Atlas.');
      console.error('   - Check internet connection and firewall (outbound DNS + TCP to Atlas).');
      console.error('   - Run this script from the same network where your backend server runs.');
      console.error('   - Or trigger the report via API while the server is running:');
      console.error('     POST /api/employees/inactivity-report/send (with Admin JWT)');
    }
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await mongoose.connection?.close();
  process.exit(0);
});

run();
