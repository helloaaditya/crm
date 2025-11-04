import mongoose from 'mongoose';

const companyDocumentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    unique: true
  },
  
  // Document Details
  name: {
    type: String,
    required: true
  },
  description: String,
  
  // Category & Type
  category: {
    type: String,
    enum: [
      'legal', 
      'financial', 
      'hr', 
      'compliance', 
      'contracts', 
      'policies', 
      'certificates', 
      'licenses', 
      'insurance',
      'tax',
      'audit',
      'project',
      'vendor',
      'customer',
      'other'
    ],
    required: true
  },
  
  subCategory: String,
  
  documentType: {
    type: String,
    enum: ['pdf', 'word', 'excel', 'image', 'spreadsheet', 'presentation', 'other'],
    default: 'pdf'
  },
  
  // File Details
  url: {
    type: String,
    required: true
  },
  fileSize: Number,
  mimeType: String,
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    url: String,
    uploadDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  
  // Dates
  uploadDate: {
    type: Date,
    default: Date.now
  },
  effectiveDate: Date,
  expiryDate: Date,
  
  // Access Control
  accessLevel: {
    type: String,
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal'
  },
  
  allowedRoles: [{
    type: String,
    enum: ['admin', 'manager', 'supervisor', 'employee', 'all']
  }],
  
  // Tags for better searchability
  tags: [String],
  
  // Related Entities
  relatedTo: {
    entityType: {
      type: String,
      enum: ['project', 'customer', 'vendor', 'employee', 'invoice', 'payment', 'work_order', 'none'],
      default: 'none'
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.entityType'
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'expired', 'deleted'],
    default: 'active'
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedDate: Date,
  
  // Notes & Comments
  notes: String,
  comments: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Audit Trail
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastAccessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastAccessedDate: Date,
  
  downloadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate document ID before validation
companyDocumentSchema.pre('validate', async function(next) {
  if (this.isNew && !this.documentId) {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const categoryPrefix = this.category.substring(0, 3).toUpperCase();
      const prefix = `DOC${categoryPrefix}${year}`;
      
      const pattern = new RegExp(`^${prefix}\\d{4}$`);
      
      const lastDoc = await mongoose.model('CompanyDocument')
        .findOne({ documentId: { $regex: pattern } })
        .sort({ documentId: -1 })
        .select('documentId')
        .lean();
      
      let nextNumber = 1;
      if (lastDoc && lastDoc.documentId) {
        const lastNumber = parseInt(lastDoc.documentId.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      this.documentId = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Update status if expired
companyDocumentSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

const CompanyDocument = mongoose.model('CompanyDocument', companyDocumentSchema);

export default CompanyDocument;

