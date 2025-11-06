# 📧 Gmail SMTP Setup for CRM Email Notifications

## 🎯 What You'll Get

After setup, your CRM will automatically send emails for:
- ✅ Welcome emails when new users are created
- ✅ Password reset links
- ✅ Leave approval/rejection notifications
- ✅ Salary processed notifications
- ✅ Work update notifications
- ✅ Any other email features

---

## 🔐 Step 1: Generate Gmail App Password

Gmail requires an "App Password" for external applications to send emails.

### Prerequisites:
- Gmail account with 2-Factor Authentication (2FA) enabled
- If 2FA not enabled, you must enable it first

### Steps to Get App Password:

1. **Enable 2-Factor Authentication (if not already)**
   - Go to: https://myaccount.google.com/security
   - Scroll to "2-Step Verification"
   - Click "Get Started"
   - Follow the setup process (verify phone number, etc.)

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
   - Sign in again if prompted
   - Under "Select app" → Choose "Mail"
   - Under "Select device" → Choose "Other (Custom name)"
   - Type: "Sanjana CRM"
   - Click "Generate"
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

3. **Save This Password!**
   - You won't be able to see it again
   - Copy it to a safe place (you'll need it below)

---

## ⚙️ Step 2: Configure Environment Variables

### For Local Development (.env file):

Add these lines to your `.env` file in the root directory:

```env
# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM=Sanjana CRM <your-email@gmail.com>
```

**Example:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=sanjanacrm2025@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=Sanjana CRM <sanjanacrm2025@gmail.com>
```

**Important:**
- Remove spaces from the app password: `abcdefghijklmnop` (16 chars)
- Use your actual Gmail address
- Don't use quotes around values

### For Render Deployment:

1. Go to: https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add these 4 variables:

| Key | Value | Example |
|-----|-------|---------|
| `EMAIL_SERVICE` | `gmail` | gmail |
| `EMAIL_USER` | Your Gmail | sanjanacrm2025@gmail.com |
| `EMAIL_PASSWORD` | Your App Password | abcdefghijklmnop |
| `EMAIL_FROM` | Display name + email | Sanjana CRM <sanjanacrm2025@gmail.com> |

6. Click **Save Changes**
7. Render will auto-redeploy (2-3 minutes)

---

## 🧪 Step 3: Test Email Sending

### Test 1: Create a New User Account
1. Go to **Settings → User Accounts**
2. Click **+ Create Account**
3. Fill in details with a real email address
4. Click **Save**
5. ✅ Account created
6. 📧 Check the email inbox - should receive welcome email

### Test 2: Check Backend Logs
After creating user, check Render logs:

**Success:**
```
📝 Creating employee record...
✅ Employee record created: EMP0005
⚠️ Email not sent: [or email sent successfully]
```

**Email Working:**
```
📧 Sending welcome email to: user@example.com
✅ Welcome email sent successfully
```

---

## 🔍 Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"
**Cause:** Wrong app password or 2FA not enabled

**Fix:**
1. Check 2FA is enabled: https://myaccount.google.com/security
2. Regenerate app password: https://myaccount.google.com/apppasswords
3. Copy the new password (remove all spaces)
4. Update EMAIL_PASSWORD in Render

### Error: "Less secure app access"
**Gmail no longer supports "less secure apps"**

**Fix:**
- You MUST use App Password (not your regular Gmail password)
- Regular password won't work anymore
- Follow Step 1 above to generate App Password

### Error: "Connection timeout"
**Cause:** Gmail SMTP blocked or wrong settings

**Fix:**
1. Check EMAIL_SERVICE is exactly: `gmail` (lowercase)
2. Check firewall isn't blocking port 465 or 587
3. Try restarting server

### Error: "Email not configured"
**Cause:** Environment variables not set

**Fix:**
1. Check all 4 variables are set in Render
2. No typos in variable names (they're case-sensitive)
3. Redeploy service after adding variables

### No Error But No Email Received
**Possible causes:**
1. Email went to spam folder (check spam)
2. Wrong recipient email address
3. Gmail daily sending limit reached (500 emails/day)

**Check:**
- Look in spam/junk folder
- Check Render logs for "Email sent successfully"
- Verify recipient email is correct

---

## 📊 Gmail SMTP Settings (For Reference)

If you need to configure manually in code:

```javascript
{
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-16-char-app-password'  // NO spaces
  },
  host: 'smtp.gmail.com',  // Auto-configured by nodemailer
  port: 465,                // Auto-configured
  secure: true              // Auto-configured
}
```

---

## 🚀 Alternative Email Services

If Gmail doesn't work for you:

### 1. SendGrid (Recommended for Production)
- **Free Tier:** 100 emails/day
- More reliable for production
- Better deliverability
- Setup: https://sendgrid.com

### 2. Mailgun
- **Free Tier:** 5,000 emails/month (first 3 months)
- Great for high volume
- Setup: https://www.mailgun.com

### 3. AWS SES
- Very cheap ($0.10 per 1,000 emails)
- Highly scalable
- Requires AWS account

### 4. Brevo (formerly Sendinblue)
- **Free Tier:** 300 emails/day
- Easy setup
- Good interface

---

## 💰 Gmail Limits

**Free Gmail Account:**
- ✅ 500 emails per day
- ✅ 500 recipients per email
- ✅ Plenty for small/medium CRM

**If you exceed:**
- Account temporarily locked (24 hours)
- Upgrade to Google Workspace if needed

---

## ✅ Complete .env Example

Here's what your `.env` file should look like (with email config):

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=your-super-secret-key-here

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=sanjana-crm-documents

# Email (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=sanjanacrm2025@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=Sanjana CRM <sanjanacrm2025@gmail.com>

# Optional
FRONTEND_URL=http://localhost:3000
```

---

## 🎯 Quick Setup Summary

### Local Development:
1. Enable 2FA on Gmail
2. Generate App Password
3. Add to `.env` file (4 variables)
4. Restart backend: `npm run dev`
5. Test by creating user account

### Render Production:
1. Same steps 1-2 above
2. Add to Render Environment (4 variables)
3. Render auto-redeploys
4. Test by creating user account

---

## 📧 Email Templates in Your CRM

Your CRM currently sends these emails:

| Event | Template | Recipients |
|-------|----------|------------|
| User Created | Welcome email with credentials | New user |
| Password Reset | Reset link | User requesting reset |
| Leave Approved | Approval notification | Employee |
| Leave Rejected | Rejection notification | Employee |
| Salary Processed | Salary processed notification | Employee |
| Work Update | Update notification | Supervisors |

---

## 🔒 Security Best Practices

1. **Never commit .env file to Git** ✅ (Already in .gitignore)
2. **Use App Password**, not regular password
3. **Rotate App Password** every 6 months
4. **Different password** for each environment (dev/prod)
5. **Monitor Gmail activity**: https://myaccount.google.com/device-activity

---

## 🆘 Need Help?

If you face issues:
1. **Check Render logs** after creating user
2. **Look for** "Email sent" or "Email error" messages
3. **Share the logs** with me
4. I can help debug!

---

## ✅ Current Status

| Feature | Status |
|---------|--------|
| User Creation | ✅ Fixed (no timeout) |
| Employee Record | ✅ Auto-created |
| Email Setup | ⏳ Needs Gmail App Password |
| Response Time | ✅ Fast (2-5 seconds) |

---

**After adding Gmail credentials, welcome emails will be sent automatically!** 📧

Let me know once you've generated the App Password and I can help you add it to Render! 🚀

