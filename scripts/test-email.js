import dotenv from 'dotenv';
import { sendEmail } from '../utils/emailService.js';

dotenv.config();

async function testEmail() {
  try {
    console.log('📧 Testing email configuration...\n');
    
    // Check environment variables
    console.log('Environment Check:');
    console.log('  EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'NOT SET');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Missing');
    console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? `✓ Set (${process.env.EMAIL_PASSWORD.length} chars)` : '✗ Missing');
    console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
    console.log('');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Email configuration missing!');
      console.error('   Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
      process.exit(1);
    }
    
    console.log('📤 Sending test email to: aadityakum123@gmail.com\n');
    
    const result = await sendEmail(
      'aadityakum123@gmail.com', // Test recipient
      'Test Email from Sanjana CRM',
      'This is a test email to verify email configuration.',
      `
        <h2>Test Email from Sanjana CRM</h2>
        <p>This is a test email to verify email configuration.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p>If you received this email, your email configuration is working correctly!</p>
      `
    );
    
    if (result && result.skipped) {
      console.log('❌ Email service not configured');
      console.log('   Check your .env file for EMAIL_USER and EMAIL_PASSWORD');
      process.exit(1);
    } else {
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', result.messageId);
      console.log('\n💡 Check the inbox of aadityakum123@gmail.com');
      console.log('   (Also check spam folder if not found)');
    }
  } catch (error) {
    console.error('\n❌ Email test failed:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    
    console.error('\n💡 Troubleshooting:');
    
    if (error.message.includes('Invalid login') || error.message.includes('Authentication failed')) {
      console.error('   → Gmail App Password is incorrect or 2FA not enabled');
      console.error('   → Generate new App Password: https://myaccount.google.com/apppasswords');
      console.error('   → Make sure to remove spaces from the 16-character password');
    } else if (error.message.includes('timeout') || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('   → Network/firewall blocking Gmail SMTP');
      console.error('   → Verify EMAIL_USER and EMAIL_PASSWORD are correct');
      console.error('   → Check if Gmail 2FA is enabled');
    } else if (error.message.includes('not configured')) {
      console.error('   → Missing EMAIL_USER or EMAIL_PASSWORD in .env');
      console.error('   → For Gmail, also set EMAIL_SERVICE=gmail');
    } else {
      console.error('   → Check server console logs for more details');
      console.error('   → Verify .env file is loaded correctly');
    }
    
    process.exit(1);
  }
  
  process.exit(0);
}

testEmail();
