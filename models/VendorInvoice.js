import mongoose from 'mongoose';

const vendorInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required']
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  amount: {
    type: Number,
    required: [true, 'Invoice amount is required'],
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainder: {
    type: Number,
    default: function() {
      return this.amount - (this.paidAmount || 0);
    }
  },
  location: {
    type: String,
    required: [true, 'Invoice location is required'],
    trim: true
  },
  invoiceUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  // Link to payments made against this invoice
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorPayment'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate remainder before saving
vendorInvoiceSchema.pre('save', function(next) {
  this.remainder = this.amount - (this.paidAmount || 0);
  
  // Update status based on payment
  if (this.remainder <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else {
    // Check if overdue
    if (this.dueDate && new Date() > this.dueDate) {
      this.status = 'overdue';
    } else {
      this.status = 'pending';
    }
  }
  
  next();
});

// Index for faster queries
vendorInvoiceSchema.index({ vendor: 1, status: 1 });
vendorInvoiceSchema.index({ location: 1 });
vendorInvoiceSchema.index({ invoiceNumber: 1 });

const VendorInvoice = mongoose.model('VendorInvoice', vendorInvoiceSchema);

export default VendorInvoice;

