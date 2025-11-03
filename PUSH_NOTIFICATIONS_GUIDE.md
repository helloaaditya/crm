# 🔔 Push Notifications - Complete Guide

## ✅ Currently Implemented Push Notifications

All these notifications automatically send **browser push notifications** when they occur:

### 1. **Project Management**
- ✅ **Project Assigned** - When an employee is assigned to a project
  - Notification: "You have been assigned to [Project Name]"
  - Action: Opens project details

### 2. **Leave Management**
- ✅ **Leave Approved** - When admin approves a leave request
  - Notification: "Your leave from [start] to [end] has been approved"
  - Action: Opens my leave page
  
- ✅ **Leave Rejected** - When admin rejects a leave request
  - Notification: "Your leave request was rejected: [reason]"
  - Action: Opens my leave page

- ✅ **Comp Off Granted** - When admin grants comp off days
  - Notification: "You have been granted [X] day(s) of comp off"
  - Action: Opens my leave page

### 3. **Salary Management**
- ✅ **Salary Processed** - When monthly salary is processed
  - Notification: "Your salary for [month] has been processed: ₹[amount]"
  - Action: Opens my salary page

### 4. **Expense Management**
- ✅ **Expense Approved** - When expense is approved
  - Notification: "Your expense of ₹[amount] for [category] has been approved"
  - Priority: High
  - Action: Opens my expenses page

- ✅ **Expense Rejected** - When expense is rejected
  - Notification: "Your expense of ₹[amount] for [category] was rejected: [reason]"
  - Priority: High
  - Action: Opens my expenses page

- ✅ **Expense Payment Processed** - When payment is completed
  - Notification: "Payment of ₹[amount] for your [category] expense has been processed"
  - Priority: High
  - Action: Opens my expenses page

## 🎯 How It Works

1. **Backend**: When any action occurs, `createNotification()` is called
2. **Database**: Notification is saved to MongoDB
3. **Push Service**: Automatically sends push to all user's devices
4. **Browser**: Shows native notification even if tab is closed
5. **Click**: Opens the relevant page in the CRM

## 📱 User Experience

### First Time Setup:
1. User logs in
2. After 3 seconds, floating prompt appears
3. User clicks "Enable Notifications"
4. Browser asks for permission
5. User allows → Subscribed!

### Ongoing Use:
- **Bell Icon** in header shows subscription status
- **Green bell** = Notifications enabled
- **Gray bell** = Notifications disabled
- **Hover over bell** → See options (Test, Disable)

### Receiving Notifications:
- Works even when browser is minimized
- Works even when tab is not active
- Shows on desktop notifications area
- Plays sound (browser default)
- Vibrates on mobile devices
- Clicking notification opens relevant page

## 🔧 Technical Details

### Backend Integration:
```javascript
// Any notification automatically sends push
await createNotification({
  recipient: userId,
  type: 'project_assigned',
  title: 'New Project',
  message: 'You have been assigned to Project ABC',
  actionUrl: '/projects/123',
  priority: 'high',
  triggeredBy: adminUserId
});
// Push notification sent automatically!
```

### Frontend:
- Service Worker: `public/service-worker.js`
- Registration: Auto on app load if permission granted
- Utilities: `src/utils/pushNotifications.js`
- UI Component: `src/components/PushNotificationPrompt.jsx`

### Database:
- Model: `PushSubscription`
- Stores: endpoint, keys (p256dh, auth)
- Tracks: active/inactive, last used
- Multi-device: Same user can have multiple subscriptions

## 🌟 Features

- ✅ **Real-time** - Notifications arrive instantly
- ✅ **Offline Support** - Service worker caches capability
- ✅ **Multi-device** - Works across all user's devices
- ✅ **Click Actions** - Opens relevant pages
- ✅ **Auto Cleanup** - Expired subscriptions marked inactive
- ✅ **Test Function** - Verify setup anytime
- ✅ **Priority Levels** - High priority requires interaction

## 🔐 Security

- **VAPID Keys**: Authenticated push messages
- **User Consent**: Requires explicit permission
- **HTTPS Only**: Works only on secure connections
- **Token Based**: JWT authentication for subscriptions

## 🌍 Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅ Yes  | ✅ Yes |
| Firefox | ✅ Yes  | ✅ Yes |
| Edge    | ✅ Yes  | ✅ Yes |
| Safari  | ✅ 16.4+ | ✅ 16.4+ |
| Opera   | ✅ Yes  | ✅ Yes |

## 📊 Notification Types

All notifications use these standard fields:

- `recipient`: User ID to receive notification
- `type`: Category (project_assigned, expense_paid, etc.)
- `title`: Bold headline in notification
- `message`: Detailed message body
- `actionUrl`: Where to navigate on click
- `priority`: normal or high (high requires interaction)
- `triggeredBy`: Who caused the notification

## 🎨 Notification Appearance

```
┌────────────────────────────────┐
│ 🔔 CRM Notification            │
├────────────────────────────────┤
│ [Title]                        │
│ [Message body text here]       │
│                                │
│ [View]  [Dismiss]              │
└────────────────────────────────┘
```

## 🚀 Adding New Notifications

To add a new push notification:

```javascript
// In your controller
import { createNotification } from '../controllers/notificationController.js';

// Create notification
await createNotification({
  recipient: employeeUserId,
  type: 'custom_type',
  title: 'Custom Title',
  message: 'Your custom message',
  actionUrl: '/custom-page',
  priority: 'normal', // or 'high'
  triggeredBy: req.user._id
});

// Push notification sent automatically!
```

## 📝 Best Practices

1. **Clear Titles**: Keep titles under 50 characters
2. **Actionable Messages**: Tell users what happened and what to do
3. **Relevant Links**: Always provide actionUrl
4. **Appropriate Priority**: Use 'high' sparingly (urgent only)
5. **Context**: Include relevant details (amounts, names, dates)

## 🐛 Troubleshooting

### "Notifications not working"
- Check browser console for errors
- Verify VAPID keys in .env
- Ensure HTTPS (or localhost)
- Check notification permission status

### "Permission denied"
- User must manually allow in browser settings
- Some browsers block on certain domains

### "Service worker not registering"
- Check `/service-worker.js` is accessible
- Verify HTTPS
- Check browser console
- Try hard refresh (Ctrl+Shift+R)

## 📈 Monitoring

Check subscription status:
```javascript
// Frontend
const subscription = await getPushSubscription();
console.log('Subscribed:', !!subscription);

// Backend API
GET /api/push/subscriptions
```

Test notifications:
```javascript
// Frontend
await sendTestPushNotification();

// Backend API
POST /api/push/test
```

---

**Setup Complete!** All major activities now send real-time browser push notifications! 🎉

