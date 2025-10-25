import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send Email
export const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const transporter = createTransporter();
    
    // If no transporter (email not configured), log warning and skip
    if (!transporter) {
      console.warn('⚠️  Email service not configured. Skipping email send.');
      console.warn('To enable email: Configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env');
      return { skipped: true, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: `"Sanjana CRM" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email Error:', error.message);
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
