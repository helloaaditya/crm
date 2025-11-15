import Fund from '../models/Fund.js';
import FundHistory from '../models/FundHistory.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get current available funds
// @route   GET /api/funds
// @access  Private (expense module)
export const getFunds = asyncHandler(async (req, res) => {
  const fund = await Fund.getFund();
  
  res.json({
    success: true,
    data: {
      availableFunds: fund.availableFunds,
      lastUpdated: fund.lastUpdated,
      lastUpdatedBy: fund.lastUpdatedBy
    }
  });
});

// @desc    Add funds
// @route   POST /api/funds/add
// @access  Private (expense module + canHandleAccounts)
export const addFunds = asyncHandler(async (req, res) => {
  const { amount, paymentMode, transactionReference, remarks } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Please enter a valid amount' });
  }
  
  const fund = await Fund.getFund();
  const previousBalance = fund.availableFunds;
  const newBalance = previousBalance + amount;
  
  // Update fund
  fund.availableFunds = newBalance;
  fund.lastUpdated = new Date();
  fund.lastUpdatedBy = req.user._id;
  await fund.save();
  
  // Create history record
  await FundHistory.create({
    transactionType: 'credit',
    amount,
    balanceAfter: newBalance,
    description: `Funds added manually - ₹${amount.toLocaleString()}`,
    referenceType: 'manual_add',
    performedBy: req.user._id,
    paymentMode: paymentMode || 'bank_transfer',
    transactionReference: transactionReference || '',
    remarks: remarks || ''
  });
  
  res.json({
    success: true,
    data: {
      previousBalance,
      amountAdded: amount,
      newBalance,
      message: `Successfully added ₹${amount.toLocaleString()} to funds`
    }
  });
});

// @desc    Get fund history
// @route   GET /api/funds/history
// @access  Private (expense module)
export const getFundHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, transactionType, limit = 50, page = 1 } = req.query;
  
  let query = {};
  
  if (transactionType) {
    query.transactionType = transactionType;
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  const [history, total] = await Promise.all([
    FundHistory.find(query)
      .populate('performedBy', 'name email')
      .populate('referenceId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    FundHistory.countDocuments(query)
  ]);
  
  res.json({
    success: true,
    data: history,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// @desc    Get fund statistics
// @route   GET /api/funds/stats
// @access  Private (expense module)
export const getFundStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }
  
  const [totalCredits, totalDebits, fund] = await Promise.all([
    FundHistory.aggregate([
      { $match: { ...dateFilter, transactionType: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    FundHistory.aggregate([
      { $match: { ...dateFilter, transactionType: 'debit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Fund.getFund()
  ]);
  
  const credits = totalCredits[0]?.total || 0;
  const debits = totalDebits[0]?.total || 0;
  
  res.json({
    success: true,
    data: {
      currentBalance: fund.availableFunds,
      totalCredits: credits,
      totalDebits: debits,
      netChange: credits - debits
    }
  });
});

// @desc    Deduct funds manually
// @route   POST /api/funds/deduct
// @access  Private (expense module + canHandleAccounts)
export const deductFundsManually = asyncHandler(async (req, res) => {
  const { amount, paymentMode, transactionReference, remarks } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Please enter a valid amount' });
  }
  
  const fund = await Fund.getFund();
  
  if (fund.availableFunds < amount) {
    return res.status(400).json({ 
      message: `Insufficient funds. Available: ₹${fund.availableFunds.toLocaleString()}, Required: ₹${amount.toLocaleString()}` 
    });
  }
  
  const previousBalance = fund.availableFunds;
  const newBalance = previousBalance - amount;
  
  // Update fund
  fund.availableFunds = newBalance;
  fund.lastUpdated = new Date();
  fund.lastUpdatedBy = req.user._id;
  await fund.save();
  
  // Create history record
  await FundHistory.create({
    transactionType: 'debit',
    amount,
    balanceAfter: newBalance,
    description: `Funds deducted manually - ₹${amount.toLocaleString()}`,
    referenceType: 'other',
    performedBy: req.user._id,
    paymentMode: paymentMode || 'bank_transfer',
    transactionReference: transactionReference || '',
    remarks: remarks || ''
  });
  
  res.json({
    success: true,
    data: {
      previousBalance,
      amountDeducted: amount,
      newBalance,
      message: `Successfully deducted ₹${amount.toLocaleString()} from funds`
    }
  });
});

// Helper function to deduct funds (used by expense controller)
export const deductFunds = async (amount, expenseId, userId, paymentMode, transactionReference, remarks) => {
  const fund = await Fund.getFund();
  
  if (fund.availableFunds < amount) {
    throw new Error(`Insufficient funds. Available: ₹${fund.availableFunds.toLocaleString()}, Required: ₹${amount.toLocaleString()}`);
  }
  
  const previousBalance = fund.availableFunds;
  const newBalance = previousBalance - amount;
  
  // Update fund
  fund.availableFunds = newBalance;
  fund.lastUpdated = new Date();
  fund.lastUpdatedBy = userId;
  await fund.save();
  
  // Create history record
  await FundHistory.create({
    transactionType: 'debit',
    amount,
    balanceAfter: newBalance,
    description: `Expense payment - ₹${amount.toLocaleString()}`,
    referenceType: 'expense',
    referenceId: expenseId,
    referenceModel: 'Expense',
    performedBy: userId,
    paymentMode: paymentMode || 'bank_transfer',
    transactionReference: transactionReference || '',
    remarks: remarks || ''
  });
  
  return {
    previousBalance,
    amountDeducted: amount,
    newBalance
  };
};

export default {
  getFunds,
  addFunds,
  deductFundsManually,
  getFundHistory,
  getFundStats,
  deductFunds
};

