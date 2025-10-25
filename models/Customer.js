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
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
