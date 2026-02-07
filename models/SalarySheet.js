import mongoose from 'mongoose';

const salarySheetSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Number, // 1-12
    required: true
  },
  year: {
    type: Number,
    required: true
  },

  // Attendance-based fields
  totalDays: { type: Number, default: 0 },       // Total working days in the month (excl Sundays)
  totalAbsent: { type: Number, default: 0 },      // Days absent
  presentDays: { type: Number, default: 0 },       // Days present
  extraDaysWorking: { type: Number, default: 0 },  // Extra days worked (holidays/weekoffs)
  extraDaysDetails: [{
    date: { type: Date },
    note: { type: String, default: '' }
  }],

  // Deductions & Advance
  advance: { type: Number, default: 0 },            // Advance amount to deduct
  timingsDeduction: { type: Number, default: 0 },   // Deduction for late timing etc.

  
  // Salary fields
  fixedSalary: { type: Number, default: 0 },        // Monthly fixed salary
  perDaySalary: { type: Number, default: 0 },        // fixedSalary / totalDays
  fivePercentDeduction: { type: Number, default: 0 }, // 5% of fixedSalary
  salaryPayable: { type: Number, default: 0 },        // perDaySalary * presentDays
  afterDeduction: { type: Number, default: 0 },       // salaryPayable - advance - timingsDeduction - 5%

  // Status
  status: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  paidDate: Date,

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

// Ensure one record per employee per month/year
salarySheetSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const SalarySheet = mongoose.model('SalarySheet', salarySheetSchema);

export default SalarySheet;
