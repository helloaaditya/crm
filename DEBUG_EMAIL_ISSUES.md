# 🔍 Debugging Email Sending Issues

## Current Issue
All 3 emails failed to send. Here's how to debug and fix it.

---

## Step 1: Check Server Console Logs

The server console should show detailed error messages. Look for:

```
❌ Email Error: [error message]
Error code: [error code]
```

Common error messages and fixes:

### Error: "Invalid login" or "Authentication failed"
**Cause**: Gmail App Password is incorrect or 2FA not enabled
**Fix**:
1. Go to https://myaccount.google.com/apppasswords
2. Generate a new App Password (16 characters, no spaces)
3. Update `.env` file with the new password

### Error: "ETIMEDOUT" or "ESOCKET"
**Cause**: Network/firewall blocking Gmail SMTP or wrong credentials
**Fix**:
1. Verify EMAIL_USER and EMAIL_PASSWORD in `.env`
2. Check if Gmail 2FA is enabled
3. Verify App Password is correct (16 chars, no spaces)
4. Check network/firewall settings

### Error: "Email service not configured"
**Cause**: Missing EMAIL_USER or EMAIL_PASSWORD in environment
**Fix**: Add to `.env`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=Sanjana CRM <your-email@gmail.com>
```

---

## Step 2: Check Your .env File

Verify these variables are set correctly:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop  # 16 chars, no spaces
EMAIL_FROM=Sanjana CRM <your-email@gmail.com>
```

**Important**:
- Remove spaces from App Password
- Use the full Gmail address for EMAIL_USER
- Restart server after changing .env

---

## Step 3: Test Email Configuration

Create a test script to verify email works:

### Create `scripts/test-email.js`:

```javascript
import dotenv from 'dotenv';
import { sendEmail } from '../utils/emailService.js';

dotenv.config();

async function testEmail() {
  try {
    console.log('📧 Testing email configuration...\n');
    
    const result = await sendEmail(
      'aadityakum123@gmail.com', // Test recipient
      'Test Email from Sanjana CRM',
      'This is a test email to verify email configuration.',
      '<h2>Test Email</h2><p>This is a test email to verify email configuration.</p>'
    );
    
    if (result && result.skipped) {
      console.log('❌ Email service not configured');
      console.log('   Check your .env file for EMAIL_USER and EMAIL_PASSWORD');
    } else {
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', result.messageId);
    }
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.message.includes('Invalid login')) {
      console.error('\n💡 Fix: Generate new Gmail App Password');
      console.error('   URL: https://myaccount.google.com/apppasswords');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Fix: Check network/firewall or verify credentials');
    }
  }
  
  process.exit(0);
}

testEmail();
```

### Run the test:

```bash
node scripts/test-email.js
```

---

## Step 4: Check Gmail App Password

1. **Verify 2FA is enabled**:
   - Go to: https://myaccount.google.com/security
   - Check "2-Step Verification" is ON

2. **Generate/Regenerate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Sanjana CRM"
   - Copy the 16-character password (remove spaces)

3. **Update .env**:
   ```env
   EMAIL_PASSWORD=abcdefghijklmnop  # No spaces!
   ```

4. **Restart server**:
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm start
   ```

---

## Step 5: Verify Email Configuration in Code

The email service logs configuration on each send. Check server console for:

```
📧 Email Config Check: {
  SERVICE: 'gmail',
  USER: '✓ Set',
  PASSWORD: '✓ Set',
  PASSWORD_LENGTH: 16
}
```

If you see:
- `SERVICE: 'NOT SET'` → Add `EMAIL_SERVICE=gmail` to .env
- `USER: '✗ Missing'` → Add `EMAIL_USER=your-email@gmail.com` to .env
- `PASSWORD: '✗ Missing'` → Add `EMAIL_PASSWORD=...` to .env
- `PASSWORD_LENGTH: 0` → EMAIL_PASSWORD is empty

---

## Step 6: Check Email Limits

Gmail has sending limits:
- **Free Gmail**: 500 emails/day
- **Google Workspace**: 2000 emails/day

If you hit the limit, you'll see errors. Wait 24 hours or upgrade.

---

## Step 7: Test with Updated Code

After fixing configuration, test again:

```bash
# Trigger reminder check
curl -X POST http://localhost:5000/api/customers/reminders/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The response should now include `failedEmails` array with details:

```json
{
  "success": true,
  "message": "Processed 1489 stale customer(s), sent 0 email(s), 3 failed",
  "data": {
    "customersFound": 1489,
    "emailsSent": 0,
    "emailsFailed": 3,
    "recipients": ["admin@sanjanacrm.com", "vasanthar@gmail.com", "aadityakum123@gmail.com"],
    "failedEmails": [
      {
        "email": "admin@sanjanacrm.com",
        "message": "Failed to send email: Invalid login",
        "errorCode": "EAUTH"
      },
      {
        "email": "vasanthar@gmail.com",
        "message": "Failed to send email: Invalid login",
        "errorCode": "EAUTH"
      },
      {
        "email": "aadityakum123@gmail.com",
        "message": "Failed to send email: Invalid login",
        "errorCode": "EAUTH"
      }
    ]
  }
}
```

---

## Common Solutions

### Solution 1: Fix Gmail App Password
```bash
# 1. Generate new App Password
# 2. Update .env:
EMAIL_PASSWORD=new-16-char-password-no-spaces

# 3. Restart server
```

### Solution 2: Use Different Email Service
If Gmail doesn't work, use SMTP:

```env
EMAIL_SERVICE=  # Leave empty
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Solution 3: Check Environment Variables
```bash
# Verify .env is loaded
node -e "require('dotenv').config(); console.log(process.env.EMAIL_USER)"
```

---

## Next Steps

1. **Check server console** for detailed error messages
2. **Run email test script** to isolate the issue
3. **Verify .env configuration** is correct
4. **Regenerate Gmail App Password** if needed
5. **Restart server** after changes
6. **Test again** with the reminder check endpoint

The updated code now returns detailed error information in the `failedEmails` array, so you can see exactly what went wrong with each email.
