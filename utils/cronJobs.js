import cron from 'node-cron';
import { autoGenerateAttendanceRecords } from './attendanceService.js';
import { checkAndSendNewCustomerReminders } from './customerReminderService.js';
import { checkAndSendEmployeeInactivityReport } from './employeeInactivityReminderService.js';

/**
 * Initialize all cron jobs
 */
export const initializeCronJobs = () => {
  console.log('🕐 Initializing cron jobs...');
  
  // Run daily at 1:00 AM to generate attendance records for previous day
  // This ensures all employees who didn't check-in get marked as absent
  cron.schedule('0 1 * * *', async () => {
    console.log('⏰ Running daily auto-attendance generation...');
    try {
      const result = await autoGenerateAttendanceRecords();
      console.log('✅ Daily attendance auto-generation completed:', result);
    } catch (error) {
      console.error('❌ Daily attendance auto-generation failed:', error);
    }
  });
  
  // Run every 6 hours to check for customers with status "new" older than 48 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Running customer reminder check...');
    try {
      const result = await checkAndSendNewCustomerReminders();
      console.log('✅ Customer reminder check completed:', result);
    } catch (error) {
      console.error('❌ Customer reminder check failed:', error);
    }
  });

  // Run daily at 8:20 PM IST – send inactivity report to kulalp447@gmail.com
  // (employees with no check-in / activity for the day)
  // node-cron: minute hour day month weekday → '20 20' = 20:20 = 8:20 PM
  const inactivityCronRun = async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running employee inactivity report (8:20 PM IST)...`);
    try {
      if (!process.env.RESEND_API_KEY && !process.env.EMAIL_USER) {
        console.warn('⚠️ Inactivity report: No RESEND_API_KEY or EMAIL_USER set – email will not be sent. Set RESEND_API_KEY on Render.');
      }
      const result = await checkAndSendEmployeeInactivityReport();
      console.log('✅ Employee inactivity report completed:', JSON.stringify(result));
      if (result.skipped || (result.success === false && result.message?.includes('skipped'))) {
        console.warn('⚠️ Inactivity report email was skipped (check RESEND_API_KEY or email config).');
      }
    } catch (error) {
      console.error('❌ Employee inactivity report failed:', error?.message || error);
    }
  };

  try {
    cron.schedule('20 20 * * *', inactivityCronRun, { timezone: 'Asia/Kolkata' });
  } catch (tzError) {
    console.warn('⚠️ Inactivity report: timezone not supported, using server time 20:20:', tzError?.message);
    cron.schedule('20 20 * * *', inactivityCronRun);
  }

  const serverTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log('✅ Cron jobs initialized successfully');
  console.log('   - Auto-attendance: Daily at 1:00 AM (server time)');
  console.log('   - Customer reminders: Every 6 hours (checks for "new" status > 48 hours)');
  console.log('   - Employee inactivity report: Daily at 8:20 PM IST (Asia/Kolkata) → kulalp447@gmail.com');
  console.log(`   - Server time now (IST): ${serverTime}`);
};

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export const stopCronJobs = () => {
  cron.getTasks().forEach(task => task.stop());
  console.log('🛑 All cron jobs stopped');
};

