import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Invoice Type
  invoiceType: {
    type: String,
    enum: ['quotation', 'proforma', 'tax_invoice', 'final'],
    required: true
  },
  
  // GST Details
  isGST: {
    type: Boolean,
    default: true
  },
  gstNumber: String,
  
  // Items
  items: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material'
    },
    description: String,
    quantity: {
      type: Number,
      required: true
    },
    unit: String,
    rate: {
      type: Number,
      required: true
    },
    amount: Number,
    gstRate: { type: Number, default: 0 }, // 5, 12, 18, 28
    gstAmount: { type: Number, default: 0 },
    // Track if material was deducted from stock
    stockDeducted: { type: Boolean, default: false }
  }],
  
  // Amounts
  subtotal: {
    type: Number,
    required: true
  },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Payment Details
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'cancelled'],
    default: 'unpaid'
  },
  
  // Dates
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  
  // Terms & Conditions
  terms: String,
  notes: String,
  
  // Document
  pdfUrl: String,
  
  // Payment Records
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }],
  
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'partial'],
    default: 'draft'
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate invoice number before validation
invoiceSchema.pre('validate', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const pattern = new RegExp(`^INV${year}${month}\\d{4}$`);
      
      // Find the highest invoice number for this month
      const lastInvoice = await mongoose.model('Invoice')
        .findOne({ invoiceNumber: { $regex: pattern } })
        .sort({ invoiceNumber: -1 })
        .select('invoiceNumber')
        .lean();
      
      let nextNumber = 1;
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const lastNumber = parseInt(lastInvoice.invoiceNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      this.invoiceNumber = `INV${year}${month}${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Calculate amounts before saving
invoiceSchema.pre('save', function(next) {
  // Calculate balance
  this.balanceAmount = this.totalAmount - this.paidAmount;
  
  // Update payment status
  if (this.status === 'cancelled') {
    this.paymentStatus = 'cancelled';
  } else if (this.paidAmount === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }
  
  // Automatically update invoice status based on payment status if not cancelled
  if (this.status !== 'cancelled') {
    if (this.paymentStatus === 'paid') {
      this.status = 'paid';
    } else if (this.paymentStatus === 'partial') {
      this.status = 'partial';
    }
  }
  
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;