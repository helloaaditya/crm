import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  alternateContact: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  callType: {
    type: String,
    enum: ['personal', 'official'],
    default: 'official'
  },
  dataSource: {
    type: String,
    enum: ['website', 'referral', 'cold_call', 'social_media', 'existing_customer', 'other'],
    default: 'other'
  },
  leadStatus: {
    type: String,
    enum: ['new', 'lead_attended', 'visited', 'quotation_sent', 'quotation_pending', 'in_progress', 'won', 'lost', 'no_information'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  leadFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  leadDate: {
    type: Date,
    default: Date.now
  },
  followUpPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  notes: String,
  tags: [String],
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

// Generate customer ID before saving
customerSchema.pre('save', async function(next) {
  if (!this.customerId) {
    let customerId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      // Get the highest existing customerId number
      const lastCustomer = await mongoose.model('Customer')
        .findOne({ customerId: { $regex: /^CUST\d+$/ } })
        .sort({ customerId: -1 });
      
      let nextNumber = 1;
      if (lastCustomer && lastCustomer.customerId) {
        const lastNumber = parseInt(lastCustomer.customerId.replace('CUST', ''), 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      
      customerId = `CUST${String(nextNumber).padStart(6, '0')}`;
      
      // Check if this customerId already exists
      const existing = await mongoose.model('Customer').findOne({ customerId });
      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
        // If exists, try with next number
        nextNumber++;
        customerId = `CUST${String(nextNumber).padStart(6, '0')}`;
      }
    }
    
    if (!isUnique) {
      return next(new Error('Failed to generate unique customer ID'));
    }
    
    this.customerId = customerId;
  }
  next();
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
