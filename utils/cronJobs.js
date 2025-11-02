import cron from 'node-cron';
import { autoGenerateAttendanceRecords } from './attendanceService.js';

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
  
  console.log('✅ Cron jobs initialized successfully');
  console.log('   - Auto-attendance: Daily at 1:00 AM');
};

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export const stopCronJobs = () => {
  cron.getTasks().forEach(task => task.stop());
  console.log('🛑 All cron jobs stopped');
};

