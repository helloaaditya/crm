import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Todo title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    url: String,
    name: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }
}, {
  timestamps: true
});

// Index for efficient queries
todoSchema.index({ assignedTo: 1, status: 1 });
todoSchema.index({ createdBy: 1 });
todoSchema.index({ dueDate: 1 });
todoSchema.index({ status: 1, priority: 1 });

// Pre-save hook to set completedDate
todoSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  if (this.isModified('status') && this.status !== 'completed' && this.completedDate) {
    this.completedDate = undefined;
  }
  next();
});

const Todo = mongoose.model('Todo', todoSchema);

export default Todo;

