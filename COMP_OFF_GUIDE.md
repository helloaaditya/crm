# ⏰ Comp Off (Compensatory Off) System Guide

## 📋 What is Comp Off?

**Comp Off** (Compensatory Off) is time off granted to employees when they work on:
- 🗓️ **Public Holidays**
- 📅 **Weekends**
- ⏰ **Overtime/Extra Hours**

Instead of overtime pay, employees receive **paid time off** that they can use later.

---

## 🎯 How It Works

### **For Admin:**

#### **1. Grant Comp Off to Employee**

When an employee works on a holiday or weekend:

**API Call:**
```javascript
POST /api/employees/:employeeId/compoff/grant

Body:
{
  "days": 1,
  "reason": "Worked on Sunday for project deadline",
  "expiryDays": 90  // Optional, defaults to 90 days
}
```

**Or use Frontend (coming soon):**
- Go to Employees page
- Click on employee
- Click "Grant Comp Off" button
- Enter days and reason
- Submit

**Result:**
- ✅ Comp off credited to employee balance
- ✅ Employee receives notification
- ✅ Recorded in comp off history
- ⏰ Expires in 90 days (default)

---

### **For Employee:**

#### **2. Apply for Comp Off Leave**

Employee goes to **"My Leave"** page:

1. Click **"Apply for Leave"**
2. Select **"⏰ Comp Off"** from dropdown
3. Select start and end dates
4. Enter reason
5. Submit

**Validation:**
- ❌ Rejected if insufficient balance
- ✅ Shows available balance before applying

#### **3. Check Comp Off Balance**

Employee can view:
- **Current Balance:** X days available
- **Earned History:** When comp off was granted
- **Used History:** When comp off was used
- **Expiry Dates:** When comp offs will expire

---

## 📊 Admin Management

### **Grant Comp Off Scenarios:**

| Scenario | Days | Reason Example |
|----------|------|----------------|
| Worked on Sunday | 1 day | "Sunday work for urgent delivery" |
| Worked on Public Holiday | 1 day | "Diwali work for project completion" |
| Worked 4+ hours overtime | 0.5 day | "Late night work for client meeting" |
| Weekend emergency work | 2 days | "Saturday-Sunday site work" |

### **Grant Comp Off API:**

```javascript
// Example: Grant 1 comp off for Sunday work
await API.employees.grantCompOff(employeeId, {
  days: 1,
  reason: "Worked on Sunday, Oct 15, 2025",
  expiryDays: 90
})
```

---

## 💡 Features

### **Balance Tracking:**
- ✅ Automatic balance calculation
- ✅ Earned vs Used tracking
- ✅ Expiry date management
- ✅ History log for auditing

### **Leave Application:**
- ✅ Balance validation before submission
- ✅ Auto-deduct on approval
- ✅ Auto-restore on rejection
- ✅ Shows available balance

### **Notifications:**
- 📬 Employee notified when comp off granted
- 📬 Employee notified when comp off leave approved/rejected
- 📊 Balance shown in notification

### **Expiry Management:**
- ⏰ Comp offs expire after 90 days (default)
- ⚠️ System tracks expiry dates
- 💡 Can be configured per grant

---

## 🔧 Technical Implementation

### **Database Schema:**

```javascript
Employee {
  compOffBalance: Number (total available days),
  compOffHistory: [{
    type: 'earned' | 'used',
    days: Number,
    date: Date,
    reason: String,
    grantedBy: ObjectId (User),
    expiryDate: Date
  }],
  leaves: [{
    leaveType: 'sick' | 'compoff' | 'unpaid',
    // ... other leave fields
  }]
}
```

### **API Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/employees/:id/compoff/grant` | Grant comp off (admin) |
| POST | `/api/employees/:id/leave` | Apply leave (including comp off) |
| PUT | `/api/employees/leave/:leaveId` | Approve/reject leave |

### **Validation Logic:**

```javascript
// When applying comp off leave
if (leaveType === 'compoff') {
  if (numberOfDays > employee.compOffBalance) {
    return error('Insufficient balance')
  }
}

// When approving comp off leave
if (status === 'approved' && leaveType === 'compoff') {
  employee.compOffBalance -= numberOfDays
  employee.compOffHistory.push({ type: 'used', days, reason })
}

// When rejecting previously approved comp off
if (status === 'rejected' && previousStatus === 'approved') {
  employee.compOffBalance += numberOfDays // Restore balance
}
```

---

## 📱 User Interface

### **Leave Types Now Available:**

1. 🤒 **Sick Leave** - For illness/medical reasons
2. ⏰ **Comp Off** - Compensatory time off (earned)
3. 💸 **Unpaid Leave** - Without pay

### **Comp Off Display:**

**Employee View:**
```
┌──────────────────────────────┐
│  Comp Off Balance: 3 days    │
├──────────────────────────────┤
│  Earned: 5 days              │
│  Used: 2 days                │
│  Available: 3 days           │
└──────────────────────────────┘
```

**Leave Application:**
```
Leave Type: [⏰ Comp Off ▼]
Available Balance: 3 days

Start Date: [____]
End Date: [____]
Days: 2

[Submit Application]
```

---

## ✅ Current Status

| Feature | Status |
|---------|--------|
| Database schema | ✅ Complete |
| Backend API | ✅ Complete |
| Grant comp off endpoint | ✅ Complete |
| Balance validation | ✅ Complete |
| Auto-deduct on approval | ✅ Complete |
| Leave type dropdown | ✅ Complete |
| Notifications | ✅ Complete |
| Frontend API | ✅ Complete |

### **Next Steps (Optional):**
- 📊 Add comp off balance display in employee profile
- 🔔 Add expiry reminders (comp offs expiring in 7 days)
- 📈 Add comp off usage analytics
- 🎨 Add comp off grant UI in employee page

---

## 🚀 Ready to Use!

The comp off system is now live. Admins can grant comp off using the API, and employees can apply for comp off leave immediately!

**System is deployed and functional!** ⏰✨

