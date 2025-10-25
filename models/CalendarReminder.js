import mongoose from 'mongoose';

const calendarReminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'vendor_payment',
      'insurance',
      'pf_esi',
      'rent',
      'emission_test',
      'fastag_recharge',
      'gas_filling',
      'electricity_bill',
      'water_bill',
      'employee_birthday',
      'project_deadline',
      'leave_request',
      'other'
    ],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  amount: Number,
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    endDate: Date
  },
  relatedTo: {
    model: { type: String, enum: ['Vendor', 'Employee', 'Project', 'Customer'] },
    id: mongoose.Schema.Types.ObjectId
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedDate: Date,
  notifyBefore: {
    type: Number,
    default: 24 // hours
  },
  attachments: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for querying by date
calendarReminderSchema.index({ date: 1, status: 1 });
calendarReminderSchema.index({ assignedTo: 1, date: 1 });

const CalendarReminder = mongoose.model('CalendarReminder', calendarReminderSchema);

export default CalendarReminder;
