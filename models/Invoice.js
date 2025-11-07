import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    sparse: true // Allow multiple null values for quotations
  },
  quotationNumber: {
    type: String,
    sparse: true // Allow multiple null values for invoices
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
    enum: ['quotation', 'proforma', 'tax_invoice', 'final', 'dc'],
    required: true
  },
  
  // Quotation to Invoice Conversion
  isConvertedToInvoice: {
    type: Boolean,
    default: false
  },
  convertedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  sourceQuotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  
  // Bill Type (Service Bill or Sales Bill)
  billType: {
    type: String,
    enum: ['service_bill', 'sales_bill'],
    default: 'service_bill'
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

// Generate invoice or quotation number before validation
invoiceSchema.pre('validate', async function(next) {
  if (this.isNew) {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Generate QUOTATION number for quotations
      if (this.invoiceType === 'quotation' && !this.quotationNumber) {
        const prefix = `QUO${year}${month}`;
        const pattern = new RegExp(`^${prefix}\\d{4}$`);
        
        const quotations = await mongoose.model('Invoice')
          .find({ quotationNumber: { $regex: pattern } })
          .select('quotationNumber')
          .lean();
        
        let nextNumber = 1;
        
        if (quotations && quotations.length > 0) {
          const numbers = quotations.map(quo => {
            const expectedLength = prefix.length + 4;
            if (quo.quotationNumber && quo.quotationNumber.length === expectedLength) {
              const numPart = quo.quotationNumber.slice(-4);
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
        this.quotationNumber = `${prefix}${sequenceNumber}`;
      }
      
      // Generate INVOICE number for invoices (not quotations)
      if (this.invoiceType !== 'quotation' && !this.invoiceNumber) {
        const prefix = `INV${year}${month}`;
        const pattern = new RegExp(`^${prefix}\\d{4}$`);
        
        const invoices = await mongoose.model('Invoice')
          .find({ invoiceNumber: { $regex: pattern } })
          .select('invoiceNumber')
          .lean();
        
        let nextNumber = 1;
        
        if (invoices && invoices.length > 0) {
          const numbers = invoices.map(inv => {
            const expectedLength = prefix.length + 4;
            if (inv.invoiceNumber && inv.invoiceNumber.length === expectedLength) {
              const numPart = inv.invoiceNumber.slice(-4);
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
        this.invoiceNumber = `${prefix}${sequenceNumber}`;
      }
      
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