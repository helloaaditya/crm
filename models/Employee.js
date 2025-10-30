import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  email: String,
  
  // Personal Details
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  
  // Employment Details
  designation: {
    type: String,
    required: true,
    enum: ['supervisor', 'engineer', 'worker', 'technician', 'manager', 'helper', 'driver', 'other']
  },
  role: {
    type: String,
    enum: ['supervisor', 'engineer', 'worker', 'technician', 'helper', 'driver', 'manager', 'admin'],
    required: true
  },
  reportingTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  department: {
    type: String,
    enum: ['construction', 'sales', 'inventory', 'admin', 'other']
  },
  joiningDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'daily_wage'],
    default: 'full_time'
  },
  
  // Salary Details
  basicSalary: {
    type: Number,
    required: true
  },
  allowances: {
    hra: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // Salary Payments
  salaryHistory: [{
    month: String, // Format: "YYYY-MM"
    basicSalary: Number,
    totalAllowances: Number,
    totalDeductions: Number,
    netSalary: Number,
    paidDate: Date,
    paymentMode: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque']
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    notes: String
  }],
  
  // Attendance
  attendance: [{
    date: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'leave', 'holiday'],
      default: 'present'
    },
    checkInTime: Date,
    checkOutTime: Date,
    checkInLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number], // [longitude, latitude]
      address: String
    },
    checkOutLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number],
      address: String
    },
    workHours: Number,
    notes: String,
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Leave Management
  leaves: [{
    leaveType: {
      type: String,
      enum: ['casual', 'sick', 'earned', 'unpaid'],
      required: true
    },
    startDate: Date,
    endDate: Date,
    numberOfDays: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedDate: { type: Date, default: Date.now }
  }],
  
  // Project Assignments
  assignedProjects: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    role: {
      type: String,
      enum: ['supervisor', 'engineer', 'worker', 'helper']
    },
    assignedDate: { type: Date, default: Date.now },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'removed'],
      default: 'active'
    },
    completionDate: Date
  }],
  
  // Managed Projects (for supervisors)
  managedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  
  // Work Updates
  workUpdates: [{
    date: { type: Date, default: Date.now },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    description: String,
    images: [String],
    audioNotes: [String],
    videoRecordings: [String],
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Salary Hold (Retention)
  holdPercent: { type: Number, default: 5 }, // percent
  holdBalance: { type: Number, default: 0 },
  holdRequests: [{
    amount: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    processedAt: Date,
    notes: String
  }],
  
  // Documents
  documents: [{
    type: String, // 'aadhar', 'pan', 'license', etc.
    url: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // Insurance & Compliance
  insurance: {
    policyNumber: String,
    provider: String,
    expiryDate: Date
  },
  pfNumber: String,
  esiNumber: String,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  exitDate: Date,
  exitReason: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate employee ID before validation
employeeSchema.pre('validate', async function(next) {
  if (this.isNew && !this.employeeId) {
    try {
      const count = await mongoose.model('Employee').countDocuments();
      this.employeeId = `EMP${String(count + 1).padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Calculate net salary
employeeSchema.methods.calculateNetSalary = function() {
  const totalAllowances = Object.values(this.allowances).reduce((sum, val) => sum + val, 0);
  const totalDeductions = Object.values(this.deductions).reduce((sum, val) => sum + val, 0);
  return this.basicSalary + totalAllowances - totalDeductions;
};

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
