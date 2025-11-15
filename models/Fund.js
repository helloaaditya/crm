import mongoose from 'mongoose';

const fundSchema = new mongoose.Schema({
  // Single record to track total available funds
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

// Ensure only one fund record exists
fundSchema.statics.getFund = async function() {
  let fund = await this.findOne();
  if (!fund) {
    fund = await this.create({ availableFunds: 0 });
  }
  return fund;
};

const Fund = mongoose.model('Fund', fundSchema);

export default Fund;

