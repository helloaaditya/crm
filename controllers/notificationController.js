import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false, type } = req.query;

  const query = { recipient: req.user._id };
  if (unreadOnly === 'true') query.isRead = false;
  if (type) query.type = type;

  const notifications = await Notification.find(query)
    .populate('triggeredBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.json({
    success: true,
    data: notifications,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    },
    unreadCount
  });
});

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.user._id);
  res.json({ success: true, data: { count } });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  await notification.markAsRead();

  res.json({
    success: true,
    data: notification
  });
});

// @desc    Mark multiple notifications as read
// @route   PUT /api/notifications/read-multiple
// @access  Private
export const markMultipleAsRead = asyncHandler(async (req, res) => {
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({ message: 'Please provide notification IDs' });
  }

  await Notification.markMultipleAsRead(notificationIds, req.user._id);

  res.json({
    success: true,
    message: 'Notifications marked as read'
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.markAllAsRead(req.user._id);

  res.json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id
  });

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json({
    success: true,
    message: 'Notification deleted'
  });
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/read
// @access  Private
export const deleteAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    recipient: req.user._id,
    isRead: true
  });

  res.json({
    success: true,
    message: `${result.deletedCount} notifications deleted`
  });
});

// =============================================================================
// HELPER FUNCTIONS FOR CREATING NOTIFICATIONS (used by other controllers)
// =============================================================================

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @returns {Promise<Notification>}
 */
export const createNotification = async (data) => {
  try {
    return await Notification.createNotification(data);
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Send notification to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data (without recipient)
 * @returns {Promise<Array>}
 */
export const sendToMultipleUsers = async (userIds, notificationData) => {
  try {
    const notifications = userIds.map(userId => ({
      recipient: userId,
      ...notificationData
    }));
    return await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error sending notifications to multiple users:', error);
    return [];
  }
};

/**
 * Common notification templates
 */
export const NotificationTemplates = {
  projectAssigned: (projectName, projectId, assignedBy) => ({
    type: 'project_assigned',
    title: 'New Project Assigned',
    message: `You have been assigned to project: ${projectName}`,
    relatedEntity: {
      entityType: 'project',
      entityId: projectId,
      entityName: projectName
    },
    actionUrl: `/projects/${projectId}`,
    priority: 'high',
    triggeredBy: assignedBy
  }),

  projectUpdated: (projectName, projectId, updatedBy) => ({
    type: 'project_updated',
    title: 'Project Updated',
    message: `Project "${projectName}" has been updated`,
    relatedEntity: {
      entityType: 'project',
      entityId: projectId,
      entityName: projectName
    },
    actionUrl: `/projects/${projectId}`,
    triggeredBy: updatedBy
  }),

  workUpdateSubmitted: (employeeName, projectName, projectId, submittedBy) => ({
    type: 'work_update_submitted',
    title: 'New Work Update',
    message: `${employeeName} submitted an update for ${projectName}`,
    relatedEntity: {
      entityType: 'project',
      entityId: projectId,
      entityName: projectName
    },
    actionUrl: `/projects/${projectId}`,
    triggeredBy: submittedBy
  }),

  leaveApproved: (employeeName, startDate, endDate, approvedBy) => ({
    type: 'leave_approved',
    title: 'Leave Approved',
    message: `Your leave request from ${startDate} to ${endDate} has been approved`,
    priority: 'high',
    actionUrl: '/my-leave',
    triggeredBy: approvedBy
  }),

  leaveRejected: (reason, rejectedBy) => ({
    type: 'leave_rejected',
    title: 'Leave Rejected',
    message: `Your leave request has been rejected. Reason: ${reason || 'Not specified'}`,
    priority: 'high',
    actionUrl: '/my-leave',
    triggeredBy: rejectedBy
  }),

  salaryProcessed: (month, amount) => ({
    type: 'salary_processed',
    title: 'Salary Processed',
    message: `Your salary for ${month} (₹${amount}) has been processed`,
    priority: 'high',
    actionUrl: '/my-salary'
  }),

  invoiceGenerated: (invoiceNumber, customerName, amount) => ({
    type: 'invoice_generated',
    title: 'Invoice Generated',
    message: `Invoice ${invoiceNumber} for ${customerName} (₹${amount}) has been generated`,
    actionUrl: '/invoices',
    priority: 'normal'
  }),

  paymentReceived: (invoiceNumber, amount, customerName) => ({
    type: 'payment_received',
    title: 'Payment Received',
    message: `Payment of ₹${amount} received for ${invoiceNumber} from ${customerName}`,
    actionUrl: '/payments',
    priority: 'high'
  }),

  lowStockAlert: (materialName, currentStock, minStock) => ({
    type: 'low_stock_alert',
    title: 'Low Stock Alert',
    message: `${materialName} is running low. Current: ${currentStock}, Minimum: ${minStock}`,
    actionUrl: '/inventory/materials',
    priority: 'urgent'
  }),

  birthdayReminder: (employeeName, employeeId) => ({
    type: 'birthday_today',
    title: '🎂 Birthday Today!',
    message: `Today is ${employeeName}'s birthday!`,
    relatedEntity: {
      entityType: 'employee',
      entityId: employeeId,
      entityName: employeeName
    },
    priority: 'low'
  }),

  reminderDue: (reminderTitle, reminderType) => ({
    type: 'reminder_due',
    title: 'Reminder Due',
    message: `${reminderTitle} - ${reminderType}`,
    actionUrl: '/calendar-reminders',
    priority: 'high'
  })
};

export default {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  createNotification,
  sendToMultipleUsers,
  NotificationTemplates
};

