import mongoose from 'mongoose';

const fundHistorySchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  
  // Reference to related entity
  referenceType: {
    type: String,
    enum: ['expense', 'manual_add', 'manual_deduct', 'adjustment', 'other', 'initial_deposit'],
    default: 'manual_add'
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Expense', null],
    default: null
  },
  
  // Who performed the transaction
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Additional metadata
  paymentMode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'other']
  },
  transactionReference: String,
  remarks: String
}, {
  timestamps: true
});

// Index for faster queries
fundHistorySchema.index({ createdAt: -1 });
fundHistorySchema.index({ referenceType: 1, referenceId: 1 });

const FundHistory = mongoose.model('FundHistory', fundHistorySchema);

export default FundHistory;

