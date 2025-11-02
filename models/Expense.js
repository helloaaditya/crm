import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  expenseId: {
    type: String,
    unique: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Expense Details
  category: {
    type: String,
    required: true,
    enum: ['petrol', 'travel', 'food', 'accommodation', 'materials', 'tools', 'medical', 'communication', 'other']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  expenseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Project Association (if applicable)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Documents & Receipts
  documents: [{
    url: String,
    type: String, // 'receipt', 'invoice', 'bill', 'other'
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // Approval Workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  rejectionReason: String,
  
  // Payment Details
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentDate: Date,
  paymentMode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi']
  },
  transactionReference: String,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional Info
  notes: String,
  remarks: String, // Admin remarks
  
  // Audit Trail
  activityLog: [{
    action: String, // 'submitted', 'approved', 'rejected', 'paid'
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: { type: Date, default: Date.now },
    notes: String
  }]
}, {
  timestamps: true
});

// Generate expense ID before validation
expenseSchema.pre('validate', async function(next) {
  if (this.isNew && !this.expenseId) {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const prefix = `EXP${year}${month}`;
      
      // Find all expenses for this month with proper format
      const pattern = new RegExp(`^${prefix}\\d{4}$`);
      
      const expenses = await mongoose.model('Expense')
        .find({ expenseId: { $regex: pattern } })
        .select('expenseId')
        .lean();
      
      let nextNumber = 1;
      
      if (expenses && expenses.length > 0) {
        const numbers = expenses.map(exp => {
          const expectedLength = prefix.length + 4;
          if (exp.expenseId.length === expectedLength) {
            const numPart = exp.expenseId.slice(-4);
            const parsed = parseInt(numPart, 10);
            return (!isNaN(parsed) && parsed >= 1 && parsed <= 9999) ? parsed : 0;
          }
          return 0;
        }).filter(num => num > 0);
        
        if (numbers.length > 0) {
          const maxNumber = Math.max(...numbers);
          nextNumber = maxNumber >= 9999 ? 1 : maxNumber + 1;
        }
      }
      
      const sequenceNumber = String(nextNumber).padStart(4, '0').slice(-4);
      this.expenseId = `${prefix}${sequenceNumber}`;
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Add activity log entry before save
expenseSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    let action = 'updated';
    if (this.status === 'approved') action = 'approved';
    else if (this.status === 'rejected') action = 'rejected';
    else if (this.status === 'paid') action = 'paid';
    
    this.activityLog.push({
      action,
      performedBy: this.approvedBy || this.paidBy,
      date: new Date(),
      notes: this.remarks || this.rejectionReason || ''
    });
  }
  next();
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;

