import mongoose from 'mongoose';

const invoiceSettingsSchema = new mongoose.Schema({
  companyInfo: {
    name: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    phone: { type: String },
    email: { type: String },
    gstin: { type: String },
    pan: { type: String },
    logoUrl: { type: String }
  },
  
  bankDetails: {
    bankName: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    branch: { type: String },
    upiId: { type: String }
  },
  
  invoiceDefaults: {
    terms: { type: String },
    notes: { type: String },
    prefix: { type: String },
    dateFormat: { type: String }
  },
  
  qrCode: {
    enabled: {
      type: Boolean,
      default: true
    },
    size: {
      type: Number,
      default: 100
    },
    includeAmount: {
      type: Boolean,
      default: true
    }
  },
  
  // Optional external provider integration for invoices (e.g., 3rd-party template service)
  externalProvider: {
    enabled: { type: Boolean, default: false },
    name: { type: String },
    // Example: https://thirdparty.example.com/render?invoiceId={{invoiceId}}&number={{invoiceNumber}}
    downloadUrlTemplate: { type: String },
  },
  
  // Theme customization for PDF generation
  theme: {
    primaryColor: { type: String, default: '#1e40af' },
    secondaryColor: { type: String, default: '#374151' },
    accentColor: { type: String, default: '#f3f4f6' },
    fontSizes: {
      companyName: { type: Number, default: 24 },
      invoiceTitle: { type: Number, default: 14 },
      headerText: { type: Number, default: 8 },
      bodyText: { type: Number, default: 7 },
      totalText: { type: Number, default: 9 }
    },
    logo: {
      enabled: { type: Boolean, default: false },
      url: { type: String },
      width: { type: Number, default: 80 },
      height: { type: Number, default: 40 },
      position: { type: String, enum: ['left', 'right', 'center'], default: 'left' }
    },
    layout: {
      showBorder: { type: Boolean, default: false },
      borderColor: { type: String, default: '#e5e7eb' },
      showAlternateRows: { type: Boolean, default: true },
      compactMode: { type: Boolean, default: false }
    }
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
invoiceSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const InvoiceSettings = mongoose.model('InvoiceSettings', invoiceSettingsSchema);

export default InvoiceSettings;