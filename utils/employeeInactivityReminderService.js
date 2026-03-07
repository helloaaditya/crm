import Employee from '../models/Employee.js';
import { sendEmail } from './emailService.js';

const INACTIVITY_REPORT_EMAIL = 'kulalp447@gmail.com';

/**
 * Normalize date to YYYY-MM-DD for comparison
 */
const normalizeDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
};

/**
 * Check if employee has any activity (check-in) for the given date.
 * Activity = attendance record for that date with checkInTime set.
 */
const hasActivityForDate = (attendanceArray, targetDate) => {
  const targetStr = normalizeDate(targetDate);
  return (attendanceArray || []).some((a) => {
    const attStr = normalizeDate(a.date);
    return attStr === targetStr && a.checkInTime;
  });
};

/**
 * Find employees with no CRM activity for the given date (no check-in that day)
 * and send a report email to kulalp447@gmail.com
 * @param {Date} [forDate] - Date to check; defaults to today
 * @returns {Promise<{ success: boolean, count?: number, message: string, ... }>}
 */
export const checkAndSendEmployeeInactivityReport = async (forDate = new Date()) => {
  try {
    const dateStr = normalizeDate(forDate);
    const forDateLabel = new Date(forDate).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    console.log(`🔔 Checking employee inactivity for date: ${dateStr} (${forDateLabel})...`);

    const allActive = await Employee.find({ isActive: { $ne: false } })
      .select('name employeeId designation role phone email department attendance')
      .lean();

    const noActivity = allActive.filter((emp) => !hasActivityForDate(emp.attendance || [], forDate));

    if (noActivity.length === 0) {
      console.log(`✅ All active employees have activity recorded for ${dateStr}`);
      return {
        success: true,
        count: 0,
        message: `No inactive employees for ${forDateLabel}. Report not sent.`
      };
    }

    console.log(`📋 Found ${noActivity.length} employee(s) with no activity for ${dateStr}`);

    const rows = noActivity.map(
      (emp, i) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; text-align: center;">${i + 1}</td>
          <td style="padding: 10px;"><strong>${emp.name || 'N/A'}</strong></td>
          <td style="padding: 10px;">${emp.employeeId || 'N/A'}</td>
          <td style="padding: 10px;">${emp.designation || 'N/A'}</td>
          <td style="padding: 10px;">${emp.role || 'N/A'}</td>
          <td style="padding: 10px;">${emp.department || 'N/A'}</td>
          <td style="padding: 10px;">${emp.phone || 'N/A'}</td>
          <td style="padding: 10px;">${emp.email || '-'}</td>
          <td style="padding: 10px;">${forDateLabel}</td>
        </tr>
      `
    ).join('');

    const subject = `⚠️ CRM Inactivity Report: ${noActivity.length} employee(s) with no activity on ${forDateLabel}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; }
          .container { max-width: 900px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e67e22; color: white; padding: 16px 20px; border-radius: 6px 6px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          table { width: 100%; border-collapse: collapse; background: white; margin-top: 16px; font-size: 14px; }
          th { background-color: #2c3e50; color: white; padding: 10px 8px; text-align: left; font-weight: bold; }
          td { padding: 10px 8px; }
          .footer { margin-top: 20px; padding: 12px; background: #ecf0f1; border-radius: 0 0 6px 6px; text-align: center; font-size: 12px; color: #7f8c8d; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0 0 4px 0;">⚠️ Employee CRM Inactivity Report</h2>
            <p style="margin: 0; opacity: 0.95;">${noActivity.length} employee(s) had no recorded activity (no check-in) on <strong>${forDateLabel}</strong></p>
          </div>
          <div class="content">
            <div class="warning">
              <strong>Summary:</strong> The following employees did not have any check-in / activity in the CRM for the date <strong>${forDateLabel}</strong>. 
              Please follow up as needed.
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 36px;">#</th>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
          <div class="footer">
            Automated report from Sanjana CRM · Generated at ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(INACTIVITY_REPORT_EMAIL, subject, '', emailHtml);

    if (result && result.skipped) {
      return {
        success: false,
        count: noActivity.length,
        message: 'Email skipped (email service not configured)',
        skipped: true
      };
    }

    console.log(`✅ Inactivity report sent to ${INACTIVITY_REPORT_EMAIL}`);
    return {
      success: true,
      count: noActivity.length,
      recipient: INACTIVITY_REPORT_EMAIL,
      message: `Report for ${forDateLabel} sent to ${INACTIVITY_REPORT_EMAIL} (${noActivity.length} employee(s) with no activity).`
    };
  } catch (error) {
    console.error('❌ Error in employee inactivity reminder:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send employee inactivity report'
    };
  }
};
