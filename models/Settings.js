import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Company Details
  company: {
    name: { type: String, default: 'Sanjana CRM' },
    logo: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    },
    phone: String,
    email: String,
    website: String,
    gstNumber: String,
    panNumber: String
  },
  
  // Invoice Settings
  invoice: {
    prefix: { type: String, default: 'INV' },
    startNumber: { type: Number, default: 1 },
    terms: String,
    defaultDueDays: { type: Number, default: 30 },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      branch: String
    }
  },
  
  // Tax Settings
  tax: {
    defaultGST: { type: Number, default: 18 },
    cgst: { type: Number, default: 9 },
    sgst: { type: Number, default: 9 },
    igst: { type: Number, default: 18 }
  },
  
  // Email Settings
  email: {
    enabled: { type: Boolean, default: false },
    host: String,
    port: Number,
    user: String,
    password: String,
    from: String
  },
  
  // Payment Gateway Settings
  razorpay: {
    enabled: { type: Boolean, default: false },
    keyId: String,
    keySecret: String
  },
  
  // AWS S3 Settings
  aws: {
    enabled: { type: Boolean, default: false },
    accessKeyId: String,
    secretAccessKey: String,
    region: String,
    bucketName: String
  },
  
  // Notification Settings
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  
  // Module Access
  modules: {
    crm: { type: Boolean, default: true },
    inventory: { type: Boolean, default: true },
    employee: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true }
  },
  
  // Theme
  theme: {
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#10b981' },
    mode: { type: String, enum: ['light', 'dark'], default: 'light' }
  },
  
  // Backup Settings
  backup: {
    enabled: { type: Boolean, default: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    lastBackup: Date
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
