import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  projectType: {
    type: String,
    enum: ['new', 'rework'],
    required: true
  },
  category: {
    type: String,
    enum: ['residential', 'commercial', 'industrial'],
    required: true
  },
  subCategory: {
    type: String,
    enum: ['waterproofing', 'flooring', 'repainting', 'civil_work'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  siteAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  startDate: Date,
  expectedEndDate: Date,
  actualEndDate: Date,
  
  // Material Requirements
  materialRequirements: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true
    },
    quantityRequired: Number,
    quantityAllocated: { type: Number, default: 0 },
    quantityUsed: { type: Number, default: 0 },
    quantityReturned: { type: Number, default: 0 },
    unit: String,
    status: {
      type: String,
      enum: ['pending', 'allocated', 'in_use', 'completed', 'returned'],
      default: 'pending'
    },
    allocatedDate: Date,
    usageLogs: [{
      date: { type: Date, default: Date.now },
      quantity: Number,
      type: { type: String, enum: ['allocated', 'used', 'returned'] },
      invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
      },
      notes: String,
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  }],
  
  // Site Visit Logs
  siteVisits: [{
    assignedPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    visitDate: Date,
    findings: String,
    images: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Team Assignment
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignmentDate: Date,
  supervisors: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    assignedDate: { type: Date, default: Date.now },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  workers: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    assignedDate: { type: Date, default: Date.now },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String
  }],
  
  // Project Activity History
  activityHistory: [{
    action: {
      type: String,
      required: true,
      enum: [
        'project_created',
        'status_changed',
        'employee_assigned',
        'employee_removed',
        'material_added',
        'material_used',
        'material_returned',
        'file_uploaded',
        'site_visit',
        'work_update',
        'invoice_created',
        'payment_received',
        'comment_added',
        'other'
      ]
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed, // Flexible object for action-specific data
    oldValue: String,
    newValue: String,
    files: [{
      type: String // File URLs
    }],
    images: [String],
    audioRecordings: [String],
    videoRecordings: [String]
  }],
  
  // Work Updates
  workUpdates: [{
    title: String,
    description: String,
    date: { type: Date, default: Date.now },
    status: String,
    images: [String],
    audioNotes: [String],
    videoRecordings: [String],
    documents: [String],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalDate: Date
  }],
  
  // Comments/Notes
  comments: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    attachments: [String]
  }],
  
  // Documents & Files
  documents: [{
    name: String,
    url: String,
    type: { type: String, enum: ['image', 'video', 'audio', 'document', 'other'] },
    size: Number,
    uploadDate: { type: Date, default: Date.now },
    description: String,
    category: { type: String, enum: ['before', 'during', 'after', 'invoice', 'warranty', 'other'] },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Return Materials
  returnedMaterials: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material'
    },
    quantity: Number,
    reason: String,
    images: [String],
    returnDate: { type: Date, default: Date.now },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Financial
  estimatedCost: Number,
  actualCost: Number,
  finalCost: Number, // Add this field to track final cost from invoices
  quotationGenerated: { type: Boolean, default: false },
  invoiceGenerated: { type: Boolean, default: false },
  
  // Warranty
  warrantyPeriod: { type: Number, default: 12 }, // in months
  warrantyCertificateUrl: String,
  warrantyExpiryDate: Date,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  notes: String
}, {
  timestamps: true
});

// Generate project ID before validation
projectSchema.pre('validate', async function(next) {
  if (this.isNew && !this.projectId) {
    try {
      const categoryPrefix = this.category.substring(0, 3).toUpperCase();
      const pattern = new RegExp(`^PRJ-${categoryPrefix}-\\d{5}$`);
      
      // Find the highest projectId for this category
      const lastProject = await mongoose.model('Project')
        .findOne({ projectId: { $regex: pattern } })
        .sort({ projectId: -1 })
        .select('projectId')
        .lean();
      
      let nextNumber = 1;
      if (lastProject && lastProject.projectId) {
        const lastNumber = parseInt(lastProject.projectId.split('-')[2]);
        nextNumber = lastNumber + 1;
      }
      
      this.projectId = `PRJ-${categoryPrefix}-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Helper method to log activity
projectSchema.methods.logActivity = function(action, description, performedBy, details = {}) {
  this.activityHistory.push({
    action,
    description,
    performedBy,
    details,
    date: new Date()
  });
};

// Helper method to add work update
projectSchema.methods.addWorkUpdate = function(updateData) {
  this.workUpdates.push(updateData);
  
  // Log activity
  this.activityHistory.push({
    action: 'work_update',
    description: `Work update added: ${updateData.title}`,
    performedBy: updateData.updatedBy,
    details: { updateId: this.workUpdates[this.workUpdates.length - 1]._id },
    date: new Date()
  });
};

// Helper method to assign employee
projectSchema.methods.assignEmployee = function(employeeId, role, assignedBy) {
  const assignment = {
    employee: employeeId,
    assignedDate: new Date(),
    assignedBy,
    role
  };
  
  if (role === 'supervisor') {
    this.supervisors.push(assignment);
  } else {
    this.workers.push(assignment);
  }
  
  // Auto update status to in_progress when first team member is assigned
  if (this.status === 'planning' && (this.supervisors.length > 0 || this.workers.length > 0)) {
    this.status = 'in_progress';
  }
  
  // Log activity
  this.activityHistory.push({
    action: 'employee_assigned',
    description: `Employee assigned as ${role}`,
    performedBy: assignedBy,
    details: { employeeId, role },
    date: new Date()
  });
};

// Helper method to mark project as complete
projectSchema.methods.markAsComplete = function(completedBy) {
  this.status = 'completed';
  this.actualEndDate = new Date();
  
  // Log activity
  this.activityHistory.push({
    action: 'status_changed',
    description: 'Project marked as completed',
    performedBy: completedBy,
    details: { oldStatus: 'in_progress', newStatus: 'completed' },
    date: new Date()
  });
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
