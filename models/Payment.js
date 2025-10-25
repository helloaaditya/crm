import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'razorpay', 'card'],
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  
  // Transaction Details
  transactionId: String,
  referenceNumber: String,
  
  // Razorpay Details (if online payment)
  razorpay: {
    orderId: String,
    paymentId: String,
    signature: String
  },
  
  // Cheque Details (if cheque payment)
  chequeDetails: {
    chequeNumber: String,
    bankName: String,
    chequeDate: Date,
    clearanceStatus: {
      type: String,
      enum: ['pending', 'cleared', 'bounced'],
      default: 'pending'
    },
    clearanceDate: Date
  },
  
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  
  notes: String,
  
  receiptUrl: String,
  
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate payment ID before saving
paymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    const year = new Date().getFullYear().toString().slice(-2);
    this.paymentId = `PAY${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
