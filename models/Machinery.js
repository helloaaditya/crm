import mongoose from 'mongoose'

const machinerySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['construction', 'waterproofing', 'electrical', 'plumbing', 'painting', 'other']
  },
  subCategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['pcs', 'sets', 'units', 'kg', 'tons', 'meters', 'liters'],
    default: 'pcs'
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  warrantyPeriod: {
    type: Number, // in months
    min: 0
  },
  warrantyExpiry: {
    type: Date
  },
  maintenanceSchedule: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'as_needed'],
    default: 'as_needed'
  },
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'out_of_order'],
    default: 'good'
  },
  location: {
    type: String,
    trim: true
  },
  assignedProjects: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    quantity: {
      type: Number,
      min: 1
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    expectedReturnDate: {
      type: Date
    },
    actualReturnDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['assigned', 'in_use', 'returned', 'damaged'],
      default: 'assigned'
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  images: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
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
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
})

// Index for better query performance
machinerySchema.index({ name: 1, category: 1 })
machinerySchema.index({ serialNumber: 1 })
machinerySchema.index({ 'assignedProjects.project': 1 })

// Virtual for calculating utilization percentage
machinerySchema.virtual('utilizationPercentage').get(function() {
  if (this.quantity === 0) return 0
  const assignedQuantity = this.assignedProjects.reduce((total, assignment) => {
    if (assignment.status === 'assigned' || assignment.status === 'in_use') {
      return total + assignment.quantity
    }
    return total
  }, 0)
  return Math.round((assignedQuantity / this.quantity) * 100)
})

// Method to check if machinery is available
machinerySchema.methods.isAvailable = function(requiredQuantity = 1) {
  return this.availableQuantity >= requiredQuantity
}

// Method to assign machinery to project
machinerySchema.methods.assignToProject = function(projectId, quantity, expectedReturnDate, notes) {
  if (!this.isAvailable(quantity)) {
    throw new Error('Insufficient available quantity')
  }
  
  this.assignedProjects.push({
    project: projectId,
    quantity: quantity,
    expectedReturnDate: expectedReturnDate,
    notes: notes,
    status: 'assigned'
  })
  
  this.availableQuantity -= quantity
  return this.save()
}

// Method to return machinery from project
machinerySchema.methods.returnFromProject = function(projectId, actualReturnDate, condition, notes) {
  const assignment = this.assignedProjects.find(
    assignment => assignment.project.toString() === projectId.toString() && 
    (assignment.status === 'assigned' || assignment.status === 'in_use')
  )
  
  if (!assignment) {
    throw new Error('Assignment not found')
  }
  
  assignment.status = 'returned'
  assignment.actualReturnDate = actualReturnDate || new Date()
  if (notes) assignment.notes = notes
  
  this.availableQuantity += assignment.quantity
  return this.save()
}

// Pre-save middleware to update available quantity
machinerySchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('assignedProjects')) {
    const assignedQuantity = this.assignedProjects.reduce((total, assignment) => {
      if (assignment.status === 'assigned' || assignment.status === 'in_use') {
        return total + assignment.quantity
      }
      return total
    }, 0)
    this.availableQuantity = this.quantity - assignedQuantity
  }
  next()
})

export default mongoose.model('Machinery', machinerySchema)
