import Customer from '../models/Customer.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { sendEmail } from './emailService.js';

/**
 * Check for customers with status 'new' older than 48 hours and send reminders
 */
export const checkAndSendNewCustomerReminders = async () => {
  try {
    console.log('🔔 Checking for customers with status "new" older than 48 hours...');
    
    // Calculate the date 48 hours ago
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    
    // Find customers with status 'new' created more than 48 hours ago
    const staleCustomers = await Customer.find({
      leadStatus: 'new',
      createdAt: { $lte: fortyEightHoursAgo },
      isActive: true
    })
      .populate('leadFrom', 'name employeeId phone email')
      .populate('assignedTo', 'name email role')
      .populate('followUpPerson', 'name employeeId phone email')
      .sort({ createdAt: 1 }); // Oldest first
    
    if (staleCustomers.length === 0) {
      console.log('✅ No stale customers found');
      return { success: true, count: 0, message: 'No customers require reminders' };
    }
    
    console.log(`📋 Found ${staleCustomers.length} customer(s) with status "new" older than 48 hours`);
    
    // Get all admin users (main_admin and admin roles)
    const adminUsers = await User.find({
      role: { $in: ['main_admin', 'admin'] },
      isActive: true
    }).select('email name');
    
    // Collect all email addresses (admin users + fixed email)
    const emailRecipients = [
      ...adminUsers.map(admin => admin.email).filter(Boolean),
      'aadityakum123@gmail.com'
    ];
    
    // Remove duplicates
    const uniqueEmails = [...new Set(emailRecipients)];
    
    if (uniqueEmails.length === 0) {
      console.warn('⚠️ No email recipients found (no admin users with emails)');
      return { success: false, count: staleCustomers.length, message: 'No email recipients found' };
    }
    
    console.log(`📧 Sending reminders to ${uniqueEmails.length} recipient(s):`, uniqueEmails);
    
    // Generate email content
    const emailSubject = `⚠️ Reminder: ${staleCustomers.length} Customer(s) with Status "New" for Over 48 Hours`;
    
    // Build HTML table for customer details
    const customerTableRows = staleCustomers.map((customer, index) => {
      const hoursOld = Math.floor((new Date() - new Date(customer.createdAt)) / (1000 * 60 * 60));
      const daysOld = Math.floor(hoursOld / 24);
      const hoursRemainder = hoursOld % 24;
      
      const leadFromInfo = customer.leadFrom 
        ? `${customer.leadFrom.name} (${customer.leadFrom.employeeId || 'N/A'})`
        : 'Not assigned';
      
      const assignedToInfo = customer.assignedTo 
        ? `${customer.assignedTo.name} (${customer.assignedTo.role || 'N/A'})`
        : 'Not assigned';
      
      const followUpInfo = customer.followUpPerson 
        ? `${customer.followUpPerson.name} (${customer.followUpPerson.employeeId || 'N/A'})`
        : 'Not assigned';
      
      return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 12px;">
            <strong>${customer.name || 'N/A'}</strong><br>
            <small style="color: #666;">ID: ${customer.customerId || 'N/A'}</small>
          </td>
          <td style="padding: 12px;">
            📞 ${customer.contactNumber || 'N/A'}<br>
            ${customer.email ? `📧 ${customer.email}` : ''}
          </td>
          <td style="padding: 12px;">
            ${customer.address?.city || 'N/A'}, ${customer.address?.state || 'N/A'}<br>
            <small>${customer.address?.street || ''} ${customer.address?.pincode || ''}</small>
          </td>
          <td style="padding: 12px;">
            <strong style="color: #e74c3c;">${daysOld}d ${hoursRemainder}h</strong><br>
            <small>Created: ${new Date(customer.createdAt).toLocaleString()}</small>
          </td>
          <td style="padding: 12px;">
            <strong>Lead From:</strong> ${leadFromInfo}<br>
            <strong>Assigned To:</strong> ${assignedToInfo}<br>
            <strong>Follow Up:</strong> ${followUpInfo}
          </td>
          <td style="padding: 12px;">
            ${customer.notes ? `<small>${customer.notes.substring(0, 100)}${customer.notes.length > 100 ? '...' : ''}</small>` : 'No notes'}
          </td>
        </tr>
      `;
    }).join('');
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e74c3c; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          table { width: 100%; border-collapse: collapse; background-color: white; margin-top: 20px; }
          th { background-color: #34495e; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 12px; }
          .footer { margin-top: 20px; padding: 15px; background-color: #ecf0f1; border-radius: 0 0 5px 5px; text-align: center; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Customer Status Reminder</h2>
            <p>${staleCustomers.length} customer(s) have been in "New" status for over 48 hours</p>
          </div>
          
          <div class="content">
            <div class="warning">
              <strong>⚠️ Action Required:</strong> The following customers have been in "New" status for more than 48 hours. 
              Please review and update their status accordingly.
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Customer Name</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Age</th>
                  <th>Employee Details</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${customerTableRows}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #e8f5e9; border-radius: 5px;">
              <strong>💡 Next Steps:</strong>
              <ul>
                <li>Review each customer and update their lead status</li>
                <li>Contact the assigned employee if needed</li>
                <li>Follow up with customers who have been waiting</li>
                <li>Update the CRM system with the latest status</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated reminder from Sanjana CRM</p>
            <p><small>Generated at: ${new Date().toLocaleString()}</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email to all recipients
    const emailPromises = uniqueEmails.map(email => 
      sendEmail(email, emailSubject, '', emailHtml).catch(error => {
        console.error(`❌ Failed to send email to ${email}:`, error.message);
        return { error: true, email, message: error.message };
      })
    );
    
    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    const failureCount = results.length - successCount;
    
    console.log(`✅ Reminder emails sent: ${successCount} successful, ${failureCount} failed`);
    
    return {
      success: true,
      count: staleCustomers.length,
      emailsSent: successCount,
      emailsFailed: failureCount,
      recipients: uniqueEmails,
      message: `Processed ${staleCustomers.length} stale customer(s), sent ${successCount} email(s)`
    };
    
  } catch (error) {
    console.error('❌ Error checking and sending customer reminders:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to process customer reminders'
    };
  }
};
