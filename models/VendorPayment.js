import mongoose from 'mongoose';

const vendorPaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'card'],
    required: true
  },
  
  // Reference Details
  referenceNumber: String, // Transaction ID, Cheque Number, etc.
  
  // PO Bill Details
  poBillNumber: String,
  poBillDate: Date,
  poBillUrl: String, // Uploaded PO bill document
  
  // Additional Documents
  documents: [{
    name: String,
    url: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // Payment Purpose
  purpose: {
    type: String,
    enum: ['material_purchase', 'service', 'rent', 'other'],
    default: 'material_purchase'
  },
  description: String,
  
  // Materials Linked (if applicable)
  materials: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material'
    },
    quantity: Number,
    rate: Number,
    amount: Number
  }],
  
  // Project Link (if applicable)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Tax Details
  isGST: {
    type: Boolean,
    default: false
  },
  gstAmount: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  netAmount: Number,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  
  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  
  notes: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate payment ID before validation
vendorPaymentSchema.pre('validate', async function(next) {
  if (this.isNew && !this.paymentId) {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const prefix = `VP${year}${month}`;
      
      const pattern = new RegExp(`^${prefix}\\d{4}$`);
      
      const payments = await mongoose.model('VendorPayment')
        .find({ paymentId: { $regex: pattern } })
        .select('paymentId')
        .lean();
      
      let nextNumber = 1;
      
      if (payments && payments.length > 0) {
        const numbers = payments.map(payment => {
          const expectedLength = prefix.length + 4;
          if (payment.paymentId.length === expectedLength) {
            const numPart = payment.paymentId.slice(-4);
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
      this.paymentId = `${prefix}${sequenceNumber}`;
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Calculate net amount before saving
vendorPaymentSchema.pre('save', function(next) {
  if (!this.netAmount) {
    this.netAmount = this.amount - (this.tdsAmount || 0);
  }
  next();
});

const VendorPayment = mongoose.model('VendorPayment', vendorPaymentSchema);

export default VendorPayment;

