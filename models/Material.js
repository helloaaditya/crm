import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  materialId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['waterproofing', 'flooring', 'painting', 'civil', 'tools', 'machinery', 'other']
  },
  subCategory: String,
  brand: String,
  product: String,
  
  // Pricing
  mrp: {
    type: Number,
    required: true
  },
  saleCost: {
    type: Number,
    required: true
  },
  
  // Stock Management
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'ltr', 'pcs', 'box', 'bag', 'sqft', 'sqm', 'other']
  },
  minStockLevel: {
    type: Number,
    default: 10
  },
  
  // Product Details
  batchCode: String,
  expiryDate: Date,
  hsinNumber: String,
  
  // Vendor Details
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  
  // Stock History
  stockHistory: [{
    type: {
      type: String,
      enum: ['inward', 'outward', 'return', 'adjustment'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    balanceAfter: Number, // Stock balance after this transaction
    date: { type: Date, default: Date.now },
    reference: String, // Invoice Number or PO Number
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    notes: String,
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate material ID before validation
materialSchema.pre('validate', async function(next) {
  if (this.isNew && !this.materialId) {
    try {
      const lastMaterial = await mongoose.model('Material')
        .findOne({ materialId: { $regex: /^MAT\d{6}$/ } })
        .sort({ materialId: -1 })
        .select('materialId')
        .lean();
      
      let nextNumber = 1;
      if (lastMaterial && lastMaterial.materialId) {
        const lastNumber = parseInt(lastMaterial.materialId.substring(3));
        nextNumber = lastNumber + 1;
      }
      
      this.materialId = `MAT${String(nextNumber).padStart(6, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Check low stock
materialSchema.methods.isLowStock = function() {
  return this.quantity <= this.minStockLevel;
};

const Material = mongoose.model('Material', materialSchema);

export default Material;
