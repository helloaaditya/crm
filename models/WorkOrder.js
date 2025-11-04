import mongoose from 'mongoose';

const workOrderSchema = new mongoose.Schema({
  workOrderId: {
    type: String,
    unique: true
  },
  
  // Work Order Details
  title: {
    type: String,
    required: true
  },
  description: String,
  
  // Associated Entities
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  
  // Work Order Type
  type: {
    type: String,
    enum: ['installation', 'maintenance', 'repair', 'inspection', 'supply', 'other'],
    default: 'installation'
  },
  
  // Dates
  issueDate: {
    type: Date,
    default: Date.now
  },
  startDate: Date,
  expectedCompletionDate: Date,
  actualCompletionDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'issued', 'in_progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Financial
  estimatedCost: Number,
  actualCost: Number,
  
  // Documents
  documents: [{
    name: {
      type: String,
      required: true
    },
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'image', 'document', 'spreadsheet', 'other'],
      default: 'pdf'
    },
    size: Number,
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String
  }],
  
  // Terms & Conditions
  terms: String,
  notes: String,
  
  // Assigned Team
  assignedTo: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    role: String,
    assignedDate: { type: Date, default: Date.now }
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate work order ID before validation
workOrderSchema.pre('validate', async function(next) {
  if (this.isNew && !this.workOrderId) {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `WO${year}`;
      
      const pattern = new RegExp(`^${prefix}\\d{5}$`);
      
      const lastWorkOrder = await mongoose.model('WorkOrder')
        .findOne({ workOrderId: { $regex: pattern } })
        .sort({ workOrderId: -1 })
        .select('workOrderId')
        .lean();
      
      let nextNumber = 1;
      if (lastWorkOrder && lastWorkOrder.workOrderId) {
        const lastNumber = parseInt(lastWorkOrder.workOrderId.substring(4));
        nextNumber = lastNumber + 1;
      }
      
      this.workOrderId = `${prefix}${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

export default WorkOrder;

