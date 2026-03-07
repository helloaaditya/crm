import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  // Check if email credentials are configured
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

// Send email via Resend API (HTTPS) - works on Render/Heroku where SMTP is blocked
const sendEmailViaResend = async (to, subject, text, html, fromAddress) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || text
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.statusCode || 'Resend API error');
  return { messageId: data.id };
};

// Send Email
export const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const fromAddress = process.env.EMAIL_FROM || `"Sanjana CRM" <${process.env.EMAIL_USER}>`;
    console.log('📧 Email Config Check:', {
      SERVICE: process.env.EMAIL_SERVICE || 'NOT SET',
      USER: process.env.EMAIL_USER ? '✓ Set' : '✗ Missing',
      PASSWORD: process.env.EMAIL_PASSWORD ? '✓ Set' : '✗ Missing',
      RESEND: process.env.RESEND_API_KEY ? '✓ Set (will use Resend)' : '✗ Not set',
      FROM_ADDRESS: fromAddress
    });

    // Prefer Resend when API key is set (works on Render; SMTP is often blocked)
    // Always use Resend's default sender - gmail.com cannot be verified on Resend
    if (process.env.RESEND_API_KEY) {
      const resendFrom = '"Sanjana CRM" <onboarding@resend.dev>';
      console.log('📤 Sending via Resend (HTTPS)...');
      console.log(`📤 FROM: ${resendFrom} TO: ${to} | Subject: ${subject}`);
      const info = await sendEmailViaResend(to, subject, text, html, resendFrom);
      console.log('✅ Email sent successfully via Resend:', info.messageId);
      return info;
    }

    const transporter = createTransporter();
    if (!transporter) {
      console.warn('⚠️  Email service not configured. Set RESEND_API_KEY (for Render) or EMAIL_USER/EMAIL_PASSWORD.');
      return { skipped: true, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text,
      html,
      attachments: attachments || []
    };

    console.log(`📤 Sending email FROM: ${fromAddress}`);
    console.log(`📤 Sending email TO: ${to}`);
    console.log(`📨 Subject: ${subject}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email Error:', error.message);
    console.error('Error code:', error.code);
    
    // Provide helpful error messages
    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('💡 SMTP connection timeout (common on Render/Heroku). Use Resend instead:');
      console.error('   Set RESEND_API_KEY in env and optionally EMAIL_FROM e.g. "Sanjana CRM <onboarding@resend.dev>"');
      console.error('   Get key: https://resend.com/api-keys');
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
