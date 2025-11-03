import Expense from '../models/Expense.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createNotification, NotificationTemplates } from './notificationController.js';
import fs from 'fs';
import path from 'path';

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (expense module)
export const getExpenses = asyncHandler(async (req, res) => {
  const { status, category, employee, startDate, endDate, search } = req.query;
  
  let query = {};
  
  if (status) query.status = status;
  if (category) query.category = category;
  if (employee) query.employee = employee;
  
  if (startDate || endDate) {
    query.expenseDate = {};
    if (startDate) query.expenseDate.$gte = new Date(startDate);
    if (endDate) query.expenseDate.$lte = new Date(endDate);
  }
  
  if (search) {
    query.$or = [
      { expenseId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  const expenses = await Expense.find(query)
    .populate('employee', 'name employeeId phone email bankDetails')
    .populate('submittedBy', 'name')
    .populate('project', 'projectId description')
    .populate('approvedBy', 'name')
    .populate('paidBy', 'name')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: expenses
  });
});

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
export const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('employee', 'name employeeId phone email basicSalary bankDetails')
    .populate('submittedBy', 'name email')
    .populate('project', 'projectId description customer')
    .populate('approvedBy', 'name')
    .populate('paidBy', 'name')
    .populate('activityLog.performedBy', 'name');
  
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }
  
  res.json({
    success: true,
    data: expense
  });
});

// @desc    Create expense (employee self-service)
// @route   POST /api/expenses/my-expense
// @access  Private
export const createExpense = asyncHandler(async (req, res) => {
  console.log('Creating expense for user:', req.user._id, req.user.name);
  console.log('Request body:', req.body);
  
  const { category, description, amount, expenseDate, project, documents, notes } = req.body;
  
  // Get employee record for the logged-in user
  const employee = await Employee.findOne({ userId: req.user._id });
  
  console.log('Employee found:', employee ? `${employee.name} (${employee.employeeId})` : 'NOT FOUND');
  
  if (!employee) {
    return res.status(404).json({ 
      message: 'Employee record not found. Please contact admin to create your employee profile.',
      userId: req.user._id
    });
  }
  
  // Validate required fields (amount is NOT required - admin will set during approval)
  if (!category || !description) {
    return res.status(400).json({ 
      message: 'Category and description are required fields',
      received: { category, description }
    });
  }
  
  // Extract document URLs (simplified)
  let documentUrls = [];
  if (documents && Array.isArray(documents)) {
    documentUrls = documents.map(doc => {
      // If doc is an object with url property, extract it
      if (typeof doc === 'object' && doc.url) {
        return doc.url;
      }
      // If doc is already a string URL, use it
      if (typeof doc === 'string') {
        return doc;
      }
      return null;
    }).filter(Boolean);
  }
  
  console.log('Extracted document URLs:', documentUrls);
  
  const expenseData = {
    employee: employee._id,
    submittedBy: req.user._id,
    category,
    description,
    amount: Number(amount) || 0, // Default to 0 if not provided, admin will set during approval
    expenseDate: expenseDate || new Date(),
    project: project || null,
    documents: documentUrls,
    notes: notes || '',
    activityLog: [{
      action: 'submitted',
      performedBy: req.user._id,
      date: new Date(),
      notes: 'Expense submitted for approval - Amount to be verified by admin'
    }]
  };
  
  console.log('Creating expense with', documentUrls.length, 'document URLs');
  
  const expense = await Expense.create(expenseData);
  
  // Notify expense approvers (users with expense module access)
  const approvers = await User.find({
    $or: [
      { role: { $in: ['admin', 'main_admin'] } },
      { module: { $in: ['expense', 'all'] } }
    ]
  }).select('_id');
  
  if (approvers.length > 0) {
    const { sendToMultipleUsers } = await import('./notificationController.js');
    await sendToMultipleUsers(
      approvers.map(u => u._id),
      {
        type: 'expense_submitted',
        title: 'New Expense Submitted',
        message: `${employee.name} submitted expense of ₹${amount} for ${category}`,
        actionUrl: `/expenses`,
        priority: 'medium'
      }
    );
  }
  
  const populated = await Expense.findById(expense._id)
    .populate('employee', 'name employeeId')
    .populate('submittedBy', 'name');
  
  res.status(201).json({
    success: true,
    data: populated,
    message: 'Expense submitted successfully'
  });
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }
  
  // Only allow update if pending
  if (expense.status !== 'pending') {
    return res.status(400).json({ message: 'Cannot update expense that has been processed' });
  }
  
  // Only creator can update
  if (expense.submittedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to update this expense' });
  }
  
  const { category, description, amount, expenseDate, project, documents, notes } = req.body;
  
  if (category) expense.category = category;
  if (description) expense.description = description;
  if (amount) expense.amount = amount;
  if (expenseDate) expense.expenseDate = expenseDate;
  if (project !== undefined) expense.project = project;
  if (documents) expense.documents = documents;
  if (notes !== undefined) expense.notes = notes;
  
  await expense.save();
  
  const updated = await Expense.findById(expense._id)
    .populate('employee', 'name employeeId')
    .populate('submittedBy', 'name');
  
  res.json({
    success: true,
    data: updated,
    message: 'Expense updated successfully'
  });
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }
  
  // Only allow delete if pending and creator is deleting
  if (expense.status !== 'pending') {
    return res.status(400).json({ message: 'Cannot delete expense that has been processed' });
  }
  
  if (expense.submittedBy.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin' && req.user.role !== 'main_admin') {
    return res.status(403).json({ message: 'Not authorized to delete this expense' });
  }
  
  await expense.deleteOne();
  
  res.json({
    success: true,
    message: 'Expense deleted successfully'
  });
});

// @desc    Approve expense
// @route   PUT /api/expenses/:id/approve
// @access  Private (expense module)
export const approveExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('employee')
    .populate('submittedBy');
  
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }
  
  if (expense.status !== 'pending') {
    return res.status(400).json({ message: 'Expense has already been processed' });
  }
  
  const { remarks } = req.body;
  
  expense.status = 'approved';
  expense.approvedBy = req.user._id;
  expense.approvalDate = new Date();
  expense.remarks = remarks || '';
  
  await expense.save();
  
  // Notify employee
  if (expense.submittedBy) {
    await createNotification({
      recipient: expense.submittedBy._id,
      type: 'expense_approved',
      title: 'Expense Approved',
      message: `Your expense of ₹${expense.amount} for ${expense.category} has been approved`,
      actionUrl: `/my-expenses`,
      priority: 'high',
      triggeredBy: req.user._id
    });
  }
  
  const updated = await Expense.findById(expense._id)
    .populate('employee', 'name employeeId')
    .populate('approvedBy', 'name');
  
  res.json({
    success: true,
    data: updated,
    message: 'Expense approved successfully'
  });
});

// @desc    Reject expense
// @route   PUT /api/expenses/:id/reject
// @access  Private (expense module)
export const rejectExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('employee')
    .populate('submittedBy');
  
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }
  
  if (expense.status !== 'pending') {
    return res.status(400).json({ message: 'Expense has already been processed' });
  }
  
  const { reason, remarks } = req.body;
  
  if (!reason) {
    return res.status(400).json({ message: 'Rejection reason is required' });
  }
  
  expense.status = 'rejected';
  expense.approvedBy = req.user._id;
  expense.approvalDate = new Date();
  expense.rejectionReason = reason;
  expense.remarks = remarks || '';
  
  await expense.save();
  
  // Notify employee
  if (expense.submittedBy) {
    await createNotification({
      recipient: expense.submittedBy._id,
      type: 'expense_rejected',
      title: 'Expense Rejected',
      message: `Your expense of ₹${expense.amount} for ${expense.category} was rejected: ${reason}`,
      actionUrl: `/my-expenses`,
      priority: 'high',
      triggeredBy: req.user._id
    });
  }
  
  const updated = await Expense.findById(expense._id)
    .populate('employee', 'name employeeId')
    .populate('approvedBy', 'name');
  
  res.json({
    success: true,
    data: updated,
    message: 'Expense rejected'
  });
});

// @desc    Process payment for expense
// @route   PUT /api/expenses/:id/pay
// @access  Private (expense module + canHandleAccounts)
export const processExpensePayment = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('employee')
    .populate('submittedBy');
  
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }
  
  if (expense.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved expenses can be paid' });
  }
  
  if (expense.paymentStatus === 'paid') {
    return res.status(400).json({ message: 'Expense has already been paid' });
  }
  
  const { paymentMode, transactionReference, paidAmount, remarks } = req.body;
  
  const amountToPay = paidAmount || expense.amount;
  
  if (amountToPay <= 0 || amountToPay > expense.amount) {
    return res.status(400).json({ message: 'Invalid payment amount' });
  }
  
  expense.status = 'paid';
  expense.paymentStatus = 'paid';
  expense.paidAmount = amountToPay;
  expense.paymentDate = new Date();
  expense.paymentMode = paymentMode || 'bank_transfer';
  expense.transactionReference = transactionReference || '';
  expense.paidBy = req.user._id;
  expense.remarks = remarks || expense.remarks;
  
  await expense.save();
  
  // Notify employee
  if (expense.submittedBy) {
    await createNotification({
      recipient: expense.submittedBy._id,
      type: 'expense_paid',
      title: 'Expense Payment Processed',
      message: `Payment of ₹${amountToPay} for your ${expense.category} expense has been processed`,
      actionUrl: `/my-expenses`,
      priority: 'high',
      triggeredBy: req.user._id
    });
  }
  
  const updated = await Expense.findById(expense._id)
    .populate('employee', 'name employeeId')
    .populate('paidBy', 'name');
  
  res.json({
    success: true,
    data: updated,
    message: 'Payment processed successfully'
  });
});

// @desc    Get my expenses (employee self-service)
// @route   GET /api/expenses/my-expenses
// @access  Private
export const getMyExpenses = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user._id });
  
  if (!employee) {
    return res.status(404).json({ message: 'Employee record not found' });
  }
  
  const expenses = await Expense.find({ employee: employee._id })
    .populate('project', 'projectId description')
    .populate('approvedBy', 'name')
    .populate('paidBy', 'name')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: expenses
  });
});

// @desc    Get expense statistics
// @route   GET /api/expenses/stats
// @access  Private (expense module)
export const getExpenseStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = {};
  if (startDate || endDate) {
    dateFilter.expenseDate = {};
    if (startDate) dateFilter.expenseDate.$gte = new Date(startDate);
    if (endDate) dateFilter.expenseDate.$lte = new Date(endDate);
  }
  
  const [
    totalExpenses,
    pendingExpenses,
    approvedExpenses,
    rejectedExpenses,
    paidExpenses,
    categoryBreakdown,
    totalAmount
  ] = await Promise.all([
    Expense.countDocuments(dateFilter),
    Expense.countDocuments({ ...dateFilter, status: 'pending' }),
    Expense.countDocuments({ ...dateFilter, status: 'approved' }),
    Expense.countDocuments({ ...dateFilter, status: 'rejected' }),
    Expense.countDocuments({ ...dateFilter, status: 'paid' }),
    Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),
    Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
          },
          paid: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$paidAmount', 0] }
          }
        }
      }
    ])
  ]);
  
  res.json({
    success: true,
    data: {
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      paidExpenses,
      categoryBreakdown,
      totalAmount: totalAmount[0] || { total: 0, approved: 0, paid: 0 }
    }
  });
});

// @desc    Upload expense documents
// @route   POST /api/expenses/upload
// @access  Private
export const uploadExpenseDocuments = asyncHandler(async (req, res) => {
  console.log('Upload request received:', {
    filesCount: req.files?.length || 0,
    hasS3: !!process.env.S3_BUCKET_NAME
  });
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }
  
  try {
    // If using S3
    if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
      console.log('Using S3 upload...');
      const { uploadBufferToS3 } = await import('../utils/s3Service.js');
      
      const uploadPromises = req.files.map(async (file, index) => {
        const s3Key = `expenses/${Date.now()}-${index}-${file.originalname}`;
        console.log('Uploading to S3:', s3Key);
        const result = await uploadBufferToS3(file.buffer, s3Key, file.mimetype);
      return result.url; // Just return the URL string
      });
      
      const documents = await Promise.all(uploadPromises);
      console.log('S3 upload successful:', documents.length, 'files');
      
      return res.json({
        success: true,
        data: documents,
        message: 'Documents uploaded successfully'
      });
    }
    
    // Local upload fallback
    console.log('Using local upload...');
    
    // Ensure documents directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads/documents directory');
    }
    
    // Save files locally
    const documents = req.files.map((file, index) => {
      const filename = `expense-${Date.now()}-${index}-${file.originalname}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      console.log('Saved file locally:', filename);
      
      return `/uploads/documents/${filename}`; // Just return the URL string
    });
    
    console.log('Local upload successful:', documents.length, 'files');
    
    res.json({
      success: true,
      data: documents,
      message: 'Documents uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
});

export default {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  processExpensePayment,
  getMyExpenses,
  getExpenseStats,
  uploadExpenseDocuments
};

