# 📧 AWS SES Setup Guide for Sanjana CRM

## 🎯 Why AWS SES?

✅ **You're already using AWS** for S3 storage  
✅ **Same credentials** - reuse your AWS keys  
✅ **Very cheap** - $0.10 per 1,000 emails  
✅ **Works on Render** - no firewall issues  
✅ **Highly reliable** - 99.9% uptime  
✅ **Professional** - production-grade service  

---

## 🚀 Quick Setup (5 Steps)

### **Step 1: Log in to AWS Console**

1. Go to: https://console.aws.amazon.com
2. Sign in with your AWS account (same one you use for S3)
3. Make sure you're in the **correct region** (e.g., `ap-south-1` for Mumbai)

---

### **Step 2: Go to SES Console**

1. In AWS Console search bar, type: **SES**
2. Click **Amazon Simple Email Service**
3. Or go directly to: https://console.aws.amazon.com/ses

---

### **Step 3: Verify Your Email Address**

AWS SES requires you to verify the "From" email address.

**Steps:**

1. In SES Console, click **Verified identities** (left sidebar)
2. Click **Create identity** button
3. Select **Email address**
4. Enter: `sanjanacrm2025@gmail.com` (your sender email)
5. Click **Create identity**

**Verification:**
1. AWS sends verification email to: sanjanacrm2025@gmail.com
2. Check that Gmail inbox
3. Click the verification link in email
4. Status changes from "Unverified" → **"Verified"** ✅

**⚠️ Important:** You can only send FROM verified email addresses!

---

### **Step 4: (Optional) Request Production Access**

**New AWS accounts start in "Sandbox Mode":**

**Sandbox Limitations:**
- ✅ Can send to **verified email addresses only**
- ✅ Max 200 emails per day
- ✅ Max 1 email per second
- ❌ Cannot send to unverified emails

**For Testing:** Sandbox is **fine**! Just verify recipient emails too.

**For Production:** Request to move out of sandbox:

1. In SES Console, click **Account dashboard**
2. See "Sending Statistics" section
3. Click **Request production access** button
4. Fill form (usually approved in 24 hours)

**You can start using SES in sandbox mode immediately!**

---

### **Step 5: Configure Render Environment**

Your AWS credentials are **already set** for S3! Just add these:

**Go to Render Dashboard → Environment:**

Add/Update these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `EMAIL_SERVICE` | `ses` | Tell system to use AWS SES |
| `EMAIL_FROM` | `Sanjana CRM <sanjanacrm2025@gmail.com>` | Must be verified in SES |
| `AWS_SES_REGION` | `ap-south-1` | Same as your S3 region (or us-east-1) |

**Optional (if different from S3):**
| Variable | Value | Only if different from S3 |
|----------|-------|---------------------------|
| `SES_ACCESS_KEY_ID` | Your AWS key | If using different AWS account |
| `SES_SECRET_ACCESS_KEY` | Your secret | If using different AWS account |

**If using same AWS account as S3:**
- ✅ `AWS_ACCESS_KEY_ID` - Already set for S3
- ✅ `AWS_SECRET_ACCESS_KEY` - Already set for S3
- ✅ `AWS_REGION` - Already set for S3
- ➕ Just add: `EMAIL_SERVICE=ses` and `EMAIL_FROM`

---

## 📊 Environment Variables Summary

### **Minimal Setup (Recommended):**

If using **same AWS account** as S3:

```env
EMAIL_SERVICE=ses
EMAIL_FROM=Sanjana CRM <sanjanacrm2025@gmail.com>
```

That's it! It will use your existing:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### **Complete Setup (If Needed):**

```env
EMAIL_SERVICE=ses
EMAIL_FROM=Sanjana CRM <sanjanacrm2025@gmail.com>
AWS_SES_REGION=ap-south-1
```

---

## 🧪 Testing in Sandbox Mode

### **Step 1: Verify Test Email Address**

To send to `aprajapa@gitam.in` (or any test email):

1. Go to SES → **Verified identities**
2. Click **Create identity**
3. Email address: `aprajapa@gitam.in`
4. Click **Create**
5. Check that inbox and click verification link
6. ✅ Now you can send to this email!

### **Step 2: Test Sending**

1. Create a user account with email: `aprajapa@gitam.in`
2. Check Render logs:

**Success:**
```
📧 Configuring AWS SES transporter...
✅ AWS SES configured with region: ap-south-1
📤 Sending email to: aprajapa@gitam.in
📨 Subject: Welcome to Sanjana CRM
✅ Email sent successfully: <message-id>
```

3. Check `aprajapa@gitam.in` inbox
4. ✅ Welcome email received!

---

## 💰 AWS SES Pricing

### **Sandbox Mode (Free):**
- ✅ **Free forever**
- ✅ 200 emails/day
- ✅ Perfect for testing
- ⚠️ Can only send to verified emails

### **Production Mode:**
- ✅ **$0.10** per 1,000 emails
- ✅ Unlimited recipients
- ✅ 50,000 emails/month ≈ **$5**
- ✅ 10,000 emails/month ≈ **$1**

**Extremely affordable!** 💰

---

## 🔧 Troubleshooting

### Error: "Email address not verified"

**Fix:**
1. Go to SES → Verified identities
2. Verify `sanjanacrm2025@gmail.com`
3. Check Gmail and click verification link
4. Wait for "Verified" status

### Error: "MessageRejected: Email address is not verified"

**Fix:**
- In sandbox mode, **both** sender and recipient must be verified
- Verify recipient email in SES too
- Or request production access

### Error: "Access Denied"

**Fix:**
- AWS credentials don't have SES permissions
- Go to IAM → Users → Your user → Add permissions
- Add policy: `AmazonSESFullAccess`

### Error: "Invalid AWS credentials"

**Fix:**
- Check `AWS_ACCESS_KEY_ID` is correct in Render
- Check `AWS_SECRET_ACCESS_KEY` is correct
- Try regenerating AWS credentials

---

## 📋 Step-by-Step Checklist

### **AWS SES Setup:**
- [ ] Log in to AWS Console
- [ ] Go to SES (https://console.aws.amazon.com/ses)
- [ ] Verify email: sanjanacrm2025@gmail.com
- [ ] Check Gmail and click verification link
- [ ] Status shows "Verified" ✅
- [ ] (Optional) Verify test recipient email too
- [ ] (Optional) Request production access

### **Render Configuration:**
- [ ] Go to Render Dashboard
- [ ] Select backend service
- [ ] Environment tab
- [ ] Add: `EMAIL_SERVICE=ses`
- [ ] Add: `EMAIL_FROM=Sanjana CRM <sanjanacrm2025@gmail.com>`
- [ ] (Optional) Add: `AWS_SES_REGION=ap-south-1`
- [ ] Save changes
- [ ] Wait 3 minutes for deployment

### **Testing:**
- [ ] Create user account with verified email
- [ ] Check Render logs for success
- [ ] Check email inbox
- [ ] ✅ Welcome email received!

---

## 🎨 What Emails Will Look Like

**From:** Sanjana CRM <sanjanacrm2025@gmail.com>  
**To:** employee@example.com  
**Subject:** Welcome to Sanjana CRM

```
Welcome to Sanjana CRM!

Dear Employee Name,

Your account has been created successfully.

Email: employee@example.com
Temporary Password: abc123

Please login and change your password immediately.

Login URL: https://crm-156r.onrender.com/login

Best regards,
Sanjana CRM Team
```

---

## 🔐 IAM Permissions (If Needed)

If you get "Access Denied", add this policy to your IAM user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota"
      ],
      "Resource": "*"
    }
  ]
}
```

Or attach the AWS managed policy: **`AmazonSESFullAccess`**

---

## 📊 Compare: Gmail vs AWS SES

| Feature | Gmail | AWS SES |
|---------|-------|---------|
| **Cost** | Free (500/day) | $0.10/1000 emails |
| **Works on Render** | ❌ Blocked | ✅ Yes |
| **Setup Time** | 5 mins | 10 mins |
| **Reliability** | Good | Excellent |
| **Deliverability** | Good | Excellent |
| **Daily Limit (Free)** | 500 | 200 (sandbox) |
| **Production** | 500 max | Unlimited |
| **Spam Issues** | Sometimes | Rarely |

**Winner for Render:** AWS SES ✅

---

## 🎯 Quick Start (Already Have AWS Account)

Since you're already using AWS for S3:

1. **AWS SES Console:**
   - https://console.aws.amazon.com/ses
   - Click "Verified identities"
   - Verify: sanjanacrm2025@gmail.com
   - Check Gmail → Click link

2. **Render Environment:**
   - Add variable: `EMAIL_SERVICE=ses`
   - Add variable: `EMAIL_FROM=Sanjana CRM <sanjanacrm2025@gmail.com>`
   - Save

3. **Test:**
   - Create user with email: sanjanacrm2025@gmail.com (or any verified email)
   - Check logs for success
   - Check email inbox

**Done!** 🎉

---

## ⏱️ How Long Does This Take?

| Step | Time |
|------|------|
| Log in to AWS | 1 min |
| Verify email | 2 mins |
| Add Render variables | 2 mins |
| Wait for deployment | 3 mins |
| **Total** | **~8 minutes** |

---

## 🆘 Need Help?

After you:
1. Verify sanjanacrm2025@gmail.com in SES
2. Add EMAIL_SERVICE=ses to Render
3. Redeploy (wait 3 mins)

Share the Render logs when creating a user. I'll help debug if needed!

---

## ✅ Current Status

| Component | Status |
|-----------|--------|
| AWS SES Code | ✅ Ready |
| User Creation | ✅ Working (no email) |
| S3 Upload | ✅ Working |
| Location Tracking | ✅ Working |
| Email Sending | ⏳ Needs SES verification |

**Next:** Verify sanjanacrm2025@gmail.com in AWS SES Console!

---

**Quick Link:** https://console.aws.amazon.com/ses/home?region=ap-south-1#/verified-identities

**Ready to start?** 🚀

