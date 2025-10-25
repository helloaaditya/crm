import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  vendorId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person is required']
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  alternateContact: String,
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  gstNumber: String,
  panNumber: String,
  category: {
    type: String,
    enum: ['materials', 'tools', 'machinery', 'services', 'other'],
    default: 'materials'
  },
  
  // Bank Details
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    branch: String
  },
  
  // Financial
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net_15', 'net_30', 'net_45', 'net_60'],
    default: 'net_30'
  },
  creditLimit: Number,
  outstandingBalance: {
    type: Number,
    default: 0
  },
  
  // Invoices
  invoices: [{
    invoiceNumber: String,
    invoiceDate: Date,
    amount: Number,
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending'
    },
    invoiceUrl: String,
    dueDate: Date,
    paymentDate: Date
  }],
  
  // Materials Supplied
  materialsSupplied: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  }],
  
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  notes: String
}, {
  timestamps: true
});

// Generate vendor ID before validation
vendorSchema.pre('validate', async function(next) {
  if (this.isNew && !this.vendorId) {
    try {
      const lastVendor = await mongoose.model('Vendor')
        .findOne({ vendorId: { $regex: /^VEN\d{6}$/ } })
        .sort({ vendorId: -1 })
        .select('vendorId')
        .lean();
      
      let nextNumber = 1;
      if (lastVendor && lastVendor.vendorId) {
        const lastNumber = parseInt(lastVendor.vendorId.substring(3));
        nextNumber = lastNumber + 1;
      }
      
      this.vendorId = `VEN${String(nextNumber).padStart(6, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
