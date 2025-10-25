import { validationResult } from 'express-validator';
import Customer from '../models/Customer.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = asyncHandler(async (req, res) => {
  const { search, leadStatus, page = 1, limit = 10 } = req.query;

  // Build query
  let query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (leadStatus) {
    query.leadStatus = leadStatus;
  }

  // Execute query with pagination
  const customers = await Customer.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Customer.countDocuments(query);

  res.json({
    success: true,
    data: customers,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id)
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name');

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  res.json({
    success: true,
    data: customer
  });
});

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = asyncHandler(async (req, res) => {
  const {
    name,
    contactNumber,
    alternateContact,
    email,
    address,
    callType,
    dataSource,
    leadStatus,
    assignedTo,
    notes,
    tags
  } = req.body;

  // Check if customer with same contact number exists
  const customerExists = await Customer.findOne({ contactNumber });
  if (customerExists) {
    return res.status(400).json({ message: 'Customer with this contact number already exists' });
  }

  const customer = await Customer.create({
    name,
    contactNumber,
    alternateContact,
    email,
    address,
    callType,
    dataSource,
    leadStatus,
    assignedTo,
    notes,
    tags,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: customer
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = asyncHandler(async (req, res) => {
  let customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  // Update customer
  customer = await Customer.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: customer
  });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  await customer.deleteOne();

  res.json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

// @desc    Get customer statistics
// @route   GET /api/customers/stats
// @access  Private
export const getCustomerStats = asyncHandler(async (req, res) => {
  const stats = await Customer.aggregate([
    {
      $group: {
        _id: '$leadStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const total = await Customer.countDocuments();

  res.json({
    success: true,
    data: {
      total,
      byStatus: stats
    }
  });
});
