# 🪣 Setup AWS S3 on Render for Document Uploads

## 🚨 Current Issue

**Error:** "Failed to upload document" or "S3 storage not configured on server"

**Cause:** AWS S3 credentials are not configured in Render environment variables.

---

## ✅ Solution: Add AWS Credentials to Render

### Step 1: Get AWS Credentials

If you already have AWS credentials, skip to Step 2.

**Option A: Use Existing AWS Account**
1. Log in to AWS Console: https://console.aws.amazon.com
2. Go to IAM → Users → Your User
3. Security Credentials → Create Access Key
4. Save the Access Key ID and Secret Access Key

**Option B: Create New AWS Account**
1. Go to https://aws.amazon.com
2. Create free tier account
3. Follow "Option A" above to create access keys

### Step 2: Create S3 Bucket

1. Go to AWS S3: https://s3.console.aws.amazon.com
2. Click "Create bucket"
3. Bucket name: `sanjana-crm-documents` (or any unique name)
4. Region: Choose closest to your users (e.g., `ap-south-1` for India)
5. Block all public access: **UNCHECK** (we need public read)
6. Click "Create bucket"

### Step 3: Configure Bucket Permissions

1. Go to your bucket → Permissions
2. Bucket Policy → Edit
3. Add this policy (replace `YOUR-BUCKET-NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

4. Save changes

### Step 4: Add Environment Variables to Render

1. Go to Render Dashboard: https://dashboard.render.com
2. Select your backend service (sanjana_crm or similar)
3. Go to **Environment** tab
4. Click **Add Environment Variable**

Add these 4 variables:

| Key | Value | Example |
|-----|-------|---------|
| `AWS_ACCESS_KEY_ID` | Your AWS Access Key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Your AWS Secret Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | Your bucket region | `ap-south-1` or `us-east-1` |
| `S3_BUCKET_NAME` | Your bucket name | `sanjana-crm-documents` |

5. Click **Save Changes**

### Step 5: Redeploy

Render will automatically redeploy with new environment variables.
- Wait 2-3 minutes for deployment to complete
- Check logs for any errors

---

## 🧪 Test Document Upload

1. Go to Employees page
2. Click **📄 Documents** on any employee
3. Click **Upload Document**
4. Select a file (PDF, JPG, or PNG)
5. Fill in document details
6. Click **Upload Document**
7. ✅ Should see: "Document uploaded successfully!"

---

## 🔍 Troubleshooting

### Error: "S3 storage not configured"
**Fix:** Environment variables not set on Render. Follow Step 4 above.

### Error: "S3 credentials are invalid"
**Fix:** Access Key ID or Secret Key is wrong. Double-check Step 4.

### Error: "S3 bucket not found"
**Fix:** Bucket name is wrong or doesn't exist. Check Step 2 & 4.

### Error: "Access Denied"
**Fix:** Bucket policy not set correctly. Follow Step 3.

### Check Render Logs

1. Render Dashboard → Your Service → Logs
2. Look for lines starting with:
   - `📤 Uploading employee document:`
   - `✅ Employee document uploaded to S3:`
   - `❌ Error uploading document:`

---

## 💰 AWS Free Tier

AWS S3 Free Tier includes:
- ✅ 5GB storage
- ✅ 20,000 GET requests
- ✅ 2,000 PUT requests
- ✅ Free for 12 months

**Good for:**
- Small to medium CRM usage
- Up to thousands of documents
- Most business needs

---

## 🔐 Security Best Practices

1. **Use IAM User** with limited permissions (not root account)
2. **Bucket Policy** allows public read only (not write)
3. **Keep credentials secret** - never commit to Git
4. **Rotate keys** every 90 days
5. **Enable MFA** on AWS account

---

## 📊 Alternative: Use Local Storage (Temporary)

If you can't set up S3 immediately, you can temporarily store files locally:

**⚠️ Not recommended for production** (files lost on Render restart)

1. Modify `uploadVendorDocument` in `controllers/mediaController.js`
2. Save to disk instead of S3
3. Serve files from `/uploads` directory

---

## ✅ Once Configured

After S3 is configured, all document uploads will work:
- ✅ Employee documents
- ✅ Vendor PO bills
- ✅ Any future file uploads

Documents will be securely stored in S3 with:
- 📦 99.999999999% durability
- 🔒 Encrypted at rest
- 🌍 Accessible from anywhere
- 💾 Automatic backups

---

**Need Help?** Share the error message from:
1. Browser Console (F12 → Console)
2. Render Logs (Dashboard → Logs)

