import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Who receives this notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      // Project notifications
      'project_assigned',
      'project_updated',
      'project_completed',
      'project_deadline',
      
      // Work update notifications
      'work_update_submitted',
      'work_update_approved',
      
      // Employee notifications
      'leave_requested',
      'leave_approved',
      'leave_rejected',
      'salary_processed',
      'attendance_marked',
      
      // Invoice & Payment notifications
      'invoice_generated',
      'invoice_due',
      'payment_received',
      'payment_overdue',
      
      // Inventory notifications
      'low_stock_alert',
      'material_expiry',
      
      // Calendar & Reminders
      'reminder_due',
      'birthday_today',
      'upcoming_event',
      
      // System notifications
      'account_created',
      'password_changed',
      'role_changed',
      
      // General
      'mention',
      'comment_added',
      'other'
    ],
    required: true,
    index: true
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  // Related entity (what this notification is about)
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['project', 'employee', 'customer', 'invoice', 'payment', 'leave', 'material', 'reminder', 'other']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String // For display purposes
  },
  
  // Action link (where to go when clicked)
  actionUrl: String,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: Date,
  
  // Who triggered this notification
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional data (flexible JSON field)
  metadata: mongoose.Schema.Types.Mixed,
  
  // Expiry (auto-delete old notifications)
  expiresAt: {
    type: Date,
    index: { expires: 0 } // TTL index - auto-deletes after expiresAt
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for age
notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  // Set expiry to 30 days from now if not provided
  if (!data.expiresAt) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    data.expiresAt = thirtyDaysFromNow;
  }
  
  return await this.create(data);
};

// Static method to mark multiple as read
notificationSchema.statics.markMultipleAsRead = async function(notificationIds, userId) {
  return await this.updateMany(
    { _id: { $in: notificationIds }, recipient: userId },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ recipient: userId, isRead: false });
};

// Static method to delete old notifications
notificationSchema.statics.deleteOldNotifications = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  return await this.deleteMany({ createdAt: { $lt: cutoffDate }, isRead: true });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

