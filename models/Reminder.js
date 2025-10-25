import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Reminder title is required'],
    trim: true
  },
  description: String,
  
  reminderType: {
    type: String,
    enum: [
      'vendor_payment',
      'insurance',
      'pf',
      'esi',
      'rent',
      'emission_test',
      'fastag_recharge',
      'gas_filling',
      'electricity_bill',
      'water_bill',
      'employee_birthday',
      'project_deadline',
      'material_expiry',
      'other'
    ],
    required: true
  },
  
  // Date & Recurrence
  reminderDate: {
    type: Date,
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  },
  
  // Related Entities
  relatedTo: {
    entityType: {
      type: String,
      enum: ['vendor', 'employee', 'project', 'customer', 'vehicle', 'other']
    },
    entityId: mongoose.Schema.Types.ObjectId
  },
  
  // Amount (if payment reminder)
  amount: Number,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'overdue'],
    default: 'pending'
  },
  
  // Notification
  notifyBefore: {
    type: Number,
    default: 24 // hours before
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  
  // Assigned To
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  
  notes: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for querying upcoming reminders
reminderSchema.index({ reminderDate: 1, status: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;
