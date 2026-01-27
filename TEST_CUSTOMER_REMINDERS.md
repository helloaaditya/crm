# 🧪 Testing Customer Reminder System

This guide explains how to test the customer reminder system that sends emails when customers remain in "New" status for over 48 hours.

## 📋 Prerequisites

1. **Email Configuration**: Ensure email is configured in `.env`:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=Sanjana CRM <your-email@gmail.com>
   ```

2. **Admin User**: You need an admin user account (main_admin or admin role) with a valid email address.

3. **Server Running**: Make sure your backend server is running.

---

## 🧪 Method 1: Manual Trigger via API (Recommended for Testing)

### Step 1: Create Test Customer with Old Date

You can create a test customer directly in MongoDB or via API with a backdated `createdAt` timestamp.

#### Option A: Using MongoDB Compass or MongoDB Shell

```javascript
// Connect to your MongoDB database
use your_database_name

// Create a test customer with createdAt set to 3 days ago (72 hours ago)
db.customers.insertOne({
  name: "Test Customer - Old Lead",
  contactNumber: "9999999999", // Use a unique number
  email: "test@example.com",
  leadStatus: "new",
  isActive: true,
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  updatedAt: new Date(),
  createdBy: ObjectId("YOUR_USER_ID_HERE") // Replace with actual user ID
})
```

#### Option B: Using API with Backdated Date

You can't directly set `createdAt` via API, but you can:
1. Create a customer via API
2. Update it in MongoDB to backdate the `createdAt` field

---

### Step 2: Trigger Reminder Check Manually

#### Using cURL:

```bash
# Replace YOUR_TOKEN with your actual JWT token
curl -X POST http://localhost:5000/api/customers/reminders/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Using Postman:

1. **Method**: POST
2. **URL**: `http://localhost:5000/api/customers/reminders/check`
3. **Headers**:
   - `Authorization: Bearer YOUR_JWT_TOKEN`
   - `Content-Type: application/json`
4. **Body**: (empty)
5. Click **Send**

#### Using Browser Console (if logged into frontend):

```javascript
// In browser console on your CRM frontend
fetch('/api/customers/reminders/check', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('Reminder Check Result:', data))
.catch(err => console.error('Error:', err))
```

#### Expected Response:

```json
{
  "success": true,
  "message": "Processed 1 stale customer(s), sent 2 email(s)",
  "data": {
    "customersFound": 1,
    "emailsSent": 2,
    "emailsFailed": 0,
    "recipients": [
      "admin@example.com",
      "aadityakum123@gmail.com"
    ]
  }
}
```

---

## 🧪 Method 2: Create Test Script

Create a test script to automate testing:

### Create `scripts/test-customer-reminders.js`:

```javascript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer.js';
import { checkAndSendNewCustomerReminders } from '../utils/customerReminderService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanjana_crm';

async function testReminders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a test customer with old date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Get a user ID (you can hardcode one or find one)
    const User = mongoose.model('User');
    const testUser = await User.findOne({ role: { $in: ['main_admin', 'admin'] } });
    
    if (!testUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Create test customer
    const testCustomer = await Customer.create({
      name: 'Test Customer - Reminder Check',
      contactNumber: `9999${Date.now().toString().slice(-6)}`, // Unique number
      email: 'testcustomer@example.com',
      leadStatus: 'new',
      isActive: true,
      createdAt: threeDaysAgo,
      createdBy: testUser._id
    });

    console.log(`✅ Created test customer: ${testCustomer.customerId}`);
    console.log(`   Created at: ${testCustomer.createdAt}`);
    console.log(`   Status: ${testCustomer.leadStatus}`);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger reminder check
    console.log('\n🔔 Triggering reminder check...');
    const result = await checkAndSendNewCustomerReminders();

    console.log('\n📊 Results:');
    console.log(JSON.stringify(result, null, 2));

    // Cleanup: Delete test customer
    await Customer.deleteOne({ _id: testCustomer._id });
    console.log('\n🧹 Cleaned up test customer');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testReminders();
```

### Run the test script:

```bash
node scripts/test-customer-reminders.js
```

---

## 🧪 Method 3: Modify Service Temporarily for Testing

You can temporarily modify the service to use a shorter time threshold (e.g., 1 hour instead of 48 hours) for faster testing:

### Edit `utils/customerReminderService.js`:

```javascript
// Temporarily change from 48 hours to 1 hour for testing
const fortyEightHoursAgo = new Date();
fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 1); // Changed from -48 to -1
```

Then:
1. Create a customer via API
2. Wait 1 hour (or use MongoDB to backdate the customer)
3. Trigger the reminder check

**Remember to change it back to 48 hours after testing!**

---

## ✅ Verification Steps

### 1. Check Server Logs

Look for these log messages in your server console:

```
🔔 Checking for customers with status "new" older than 48 hours...
📋 Found 1 customer(s) with status "new" older than 48 hours
📧 Sending reminders to 2 recipient(s): [ 'admin@example.com', 'aadityakum123@gmail.com' ]
📤 Sending email to: admin@example.com
📨 Subject: ⚠️ Reminder: 1 Customer(s) with Status "New" for Over 48 Hours
✅ Email sent successfully: <message-id>
✅ Reminder emails sent: 2 successful, 0 failed
```

### 2. Check Email Inbox

Check the inboxes of:
- All admin users (main_admin and admin roles)
- `aadityakum123@gmail.com`

You should receive an email with:
- Subject: `⚠️ Reminder: X Customer(s) with Status "New" for Over 48 Hours`
- HTML table with customer details
- Employee information (leadFrom, assignedTo, followUpPerson)
- Age of the lead (how long it's been in "new" status)

### 3. Check API Response

The manual trigger endpoint should return:
```json
{
  "success": true,
  "message": "Processed 1 stale customer(s), sent 2 email(s)",
  "data": {
    "customersFound": 1,
    "emailsSent": 2,
    "emailsFailed": 0,
    "recipients": ["admin@example.com", "aadityakum123@gmail.com"]
  }
}
```

---

## 🔍 Troubleshooting

### No customers found?

1. **Check customer status**: Must be exactly `'new'` (lowercase)
2. **Check createdAt**: Must be older than 48 hours
3. **Check isActive**: Must be `true`
4. **Check MongoDB**: Verify the customer exists with correct fields

### No emails sent?

1. **Check email configuration**: Verify `.env` has correct EMAIL_USER and EMAIL_PASSWORD
2. **Check admin users**: Ensure at least one admin user has an email address
3. **Check email service**: Test email sending separately
4. **Check logs**: Look for error messages in server console

### Emails going to spam?

- Check spam/junk folder
- Verify email sender (EMAIL_FROM) is correct
- Consider adding the sender to contacts

---

## 🕐 Automatic Testing (Cron Job)

The cron job runs automatically every 6 hours. To verify it's working:

1. **Check server startup logs**:
   ```
   🕐 Initializing cron jobs...
   ✅ Cron jobs initialized successfully
      - Auto-attendance: Daily at 1:00 AM
      - Customer reminders: Every 6 hours (checks for "new" status > 48 hours)
   ```

2. **Wait for cron job to run** (or check logs after 6 hours)

3. **Verify emails are sent automatically**

---

## 📝 Quick Test Checklist

- [ ] Email configuration set in `.env`
- [ ] At least one admin user exists with email
- [ ] Test customer created with old `createdAt` date
- [ ] Customer has `leadStatus: 'new'`
- [ ] Customer has `isActive: true`
- [ ] Manual trigger endpoint called successfully
- [ ] Server logs show reminder check executed
- [ ] Emails received in admin inboxes
- [ ] Email received at `aadityakum123@gmail.com`
- [ ] Email contains correct customer details
- [ ] Email contains employee information

---

## 🎯 Example Test Scenario

1. **Create test customer** (via MongoDB):
   ```javascript
   db.customers.insertOne({
     name: "John Doe - Test Lead",
     contactNumber: "9876543210",
     email: "john@example.com",
     leadStatus: "new",
     isActive: true,
     createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
     updatedAt: new Date(),
     createdBy: ObjectId("YOUR_USER_ID")
   })
   ```

2. **Trigger reminder check** (via API):
   ```bash
   curl -X POST http://localhost:5000/api/customers/reminders/check \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Verify results**:
   - Check API response
   - Check server logs
   - Check email inboxes

4. **Cleanup**:
   ```javascript
   db.customers.deleteOne({ contactNumber: "9876543210" })
   ```

---

## 💡 Tips

- Use unique contact numbers for test customers to avoid conflicts
- Test with different scenarios (with/without employee assignments)
- Verify email formatting looks good in different email clients
- Check that the cron job runs automatically after server restart
- Monitor server logs for any errors during reminder checks
