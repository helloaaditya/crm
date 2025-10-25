import mongoose from 'mongoose';

const invoiceSettingsSchema = new mongoose.Schema({
  companyInfo: {
    name: {
      type: String,
      default: 'Sanjana Enterprises'
    },
    address: {
      type: String,
      default: '# 786/1/30&31, 3rd main, 2nd cross, telecom layout, beside muneshwara temple, srirampura, jakkurpost'
    },
    city: {
      type: String,
      default: 'Bangalore'
    },
    state: {
      type: String,
      default: 'Karnataka'
    },
    pincode: {
      type: String,
      default: '561203'
    },
    phone: {
      type: String,
      default: '+91 9916290799'
    },
    email: {
      type: String,
      default: 'sanjana.waterproofing@gmail.com'
    },
    gstin: {
      type: String,
      default: 'GSTIN1234567890'
    },
    pan: {
      type: String,
      default: 'PAN1234567'
    },
    logoUrl: {
      type: String,
      default: ''
    }
  },
  
  bankDetails: {
    bankName: {
      type: String,
      default: 'State Bank of India'
    },
    accountName: {
      type: String,
      default: 'Sanjana Enterprises'
    },
    accountNumber: {
      type: String,
      default: '123456789012'
    },
    ifscCode: {
      type: String,
      default: 'SBIN0001234'
    },
    branch: {
      type: String,
      default: 'Main Branch, Bangalore'
    },
    upiId: {
      type: String,
      default: 'sanjana@sbi'
    }
  },
  
  invoiceDefaults: {
    terms: {
      type: String,
      default: '1. Payment terms are 30 days from the date of invoice.\n2. Interest @ 24% per annum will be charged on overdue amounts.\n3. All disputes are subject to Bangalore jurisdiction.'
    },
    notes: {
      type: String,
      default: 'Thank you for your business!'
    },
    prefix: {
      type: String,
      default: 'INV'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    }
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