import nodemailer from 'nodemailer';
import AWS from 'aws-sdk';

// Create transporter
const createTransporter = () => {
  // AWS SES configuration (Recommended for production)
  // SES uses AWS credentials, not EMAIL_USER/PASSWORD
  if (process.env.EMAIL_SERVICE === 'ses' || process.env.EMAIL_SERVICE === 'aws-ses') {
    console.log('📧 Configuring AWS SES transporter...');
    
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials missing for SES');
      return null;
    }
    
    // Configure AWS SES
    const ses = new AWS.SES({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-south-1',
      apiVersion: '2010-12-01'
    });
    
    console.log('✅ AWS SES configured with region:', process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-south-1');
    
    return nodemailer.createTransport({
      SES: { ses, aws: AWS },
      sendingRate: 1 // Max 1 email per second (safe for sandbox)
    });
  }
  
  // Check if email credentials are configured for other services
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️ Email not configured: Missing EMAIL_USER or EMAIL_PASSWORD');
    return null;
  }
  
  // Gmail-specific configuration
  if (process.env.EMAIL_SERVICE === 'gmail') {
    console.log('📧 Configuring Gmail transporter...');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      // Reduced timeouts to fail faster if Gmail is blocked
      connectionTimeout: 5000, // 5 seconds to connect
      greetingTimeout: 5000,   // 5 seconds for handshake
      socketTimeout: 5000      // 5 seconds for response
    });
  }
  
  // Generic SMTP configuration (for other email services)
  if (!process.env.EMAIL_HOST) {
    console.warn('⚠️ Email not configured: Missing EMAIL_HOST or EMAIL_SERVICE');
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
};

// Send Email
export const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    // Validate email configuration
    console.log('📧 Email Config Check:', {
      SERVICE: process.env.EMAIL_SERVICE || 'NOT SET',
      USER: process.env.EMAIL_USER ? '✓ Set' : '✗ Missing',
      PASSWORD: process.env.EMAIL_PASSWORD ? '✓ Set' : '✗ Missing',
      PASSWORD_LENGTH: process.env.EMAIL_PASSWORD?.length || 0
    });
    
    const transporter = createTransporter();
    
    // If no transporter (email not configured), log warning and skip
    if (!transporter) {
      console.warn('⚠️  Email service not configured. Skipping email send.');
      console.warn('Missing: EMAIL_USER or EMAIL_PASSWORD');
      console.warn('For Gmail: Also set EMAIL_SERVICE=gmail');
      return { skipped: true, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Sanjana CRM" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
      attachments: attachments
    };

    console.log(`📤 Sending email to: ${to}`);
    console.log(`📨 Subject: ${subject}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email Error:', error.message);
    console.error('Error code:', error.code);
    
    // Provide helpful error messages
    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('💡 Possible causes:');
      console.error('   1. Wrong Gmail App Password (must be 16 chars, no spaces)');
      console.error('   2. Gmail 2FA not enabled');
      console.error('   3. Network firewall blocking Gmail SMTP');
      console.error('   4. EMAIL_PASSWORD not set in environment variables');
    } else if (error.message.includes('Invalid login')) {
      console.error('💡 Gmail App Password is incorrect or 2FA not enabled');
      console.error('   Generate new: https://myaccount.google.com/apppasswords');
    }
    
    throw new Error('Failed to send email: ' + error.message);
  }
};

// Send Invoice Email
export const sendInvoiceEmail = async (customerEmail, invoiceData, pdfPath) => {
  const subject = `Invoice #${invoiceData.invoiceNumber}`;
  const html = `
    <h2>Invoice from Sanjana CRM</h2>
    <p>Dear ${invoiceData.customerName},</p>
    <p>Please find attached your invoice #${invoiceData.invoiceNumber}</p>
    <p><strong>Total Amount:</strong> ₹${invoiceData.totalAmount}</p>
    <p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
    <p>Thank you for your business!</p>
    <br>
    <p>Best regards,<br>Sanjana CRM Team</p>
  `;

  const attachments = [{
    filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
    path: pdfPath
  }];

  return await sendEmail(customerEmail, subject, '', html, attachments);
};

// Send Reminder Email
export const sendReminderEmail = async (userEmail, reminderData) => {
  const subject = `Reminder: ${reminderData.title}`;
  const html = `
    <h2>Reminder Notification</h2>
    <p><strong>Title:</strong> ${reminderData.title}</p>
    <p><strong>Type:</strong> ${reminderData.reminderType}</p>
    <p><strong>Date:</strong> ${new Date(reminderData.reminderDate).toLocaleDateString()}</p>
    ${reminderData.description ? `<p><strong>Description:</strong> ${reminderData.description}</p>` : ''}
    ${reminderData.amount ? `<p><strong>Amount:</strong> ₹${reminderData.amount}</p>` : ''}
    <br>
    <p>Please take necessary action.</p>
    <p>Best regards,<br>Sanjana CRM</p>
  `;

  return await sendEmail(userEmail, subject, '', html);
};

// Send Welcome Email
export const sendWelcomeEmail = async (userEmail, userName, tempPassword) => {
  const subject = 'Welcome to Sanjana CRM';
  const html = `
    <h2>Welcome to Sanjana CRM!</h2>
    <p>Dear ${userName},</p>
    <p>Your account has been created successfully.</p>
    <p><strong>Email:</strong> ${userEmail}</p>
    <p><strong>Temporary Password:</strong> ${tempPassword}</p>
    <p>Please login and change your password immediately.</p>
    <p>Login URL: ${process.env.FRONTEND_URL}/login</p>
    <br>
    <p>Best regards,<br>Sanjana CRM Team</p>
  `;

  return await sendEmail(userEmail, subject, '', html);
};

// Send Password Reset Email
export const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const subject = 'Password Reset Request';
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <br>
    <p>Best regards,<br>Sanjana CRM Team</p>
  `;

  return await sendEmail(userEmail, subject, '', html);
};
