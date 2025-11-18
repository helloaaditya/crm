import mongoose from 'mongoose';

const employeeFundSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  availableFunds: {
    type: Number,
    default: 0,
    min: 0
  },
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure one fund record per employee
employeeFundSchema.statics.getOrCreateFund = async function(employeeId) {
  let fund = await this.findOne({ employee: employeeId });
  if (!fund) {
    fund = await this.create({ 
      employee: employeeId,
      availableFunds: 0 
    });
  }
  return fund;
};

// Index for faster queries
employeeFundSchema.index({ employee: 1 });

const EmployeeFund = mongoose.model('EmployeeFund', employeeFundSchema);

export default EmployeeFund;

