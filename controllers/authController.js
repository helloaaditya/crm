import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (but should be admin-only in production)
export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone, role, module, permissions } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || 'employee',
    module: module || 'all',
    permissions: permissions || {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canHandleAccounts: false
    },
    createdBy: req.user?._id
  });

  // Auto-create Employee record for non-admin users
  if (role && role !== 'main_admin') {
    try {
      // Generate unique employee ID
      const employeeCount = await Employee.countDocuments();
      const employeeId = `EMP${String(employeeCount + 1).padStart(4, '0')}`;

      await Employee.create({
        employeeId,
        userId: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        designation: role === 'admin' ? 'admin' : role || 'worker',
        role: role || 'worker',
        joiningDate: new Date(),
        basicSalary: 0, // Admin can update later
        employmentType: 'full_time',
        createdBy: req.user?._id || user._id
      });
    } catch (error) {
      console.log('Employee record creation skipped:', error.message);
    }
  }

  // Send welcome email (optional, can be disabled)
  try {
    await sendWelcomeEmail(email, name, password);
  } catch (error) {
    console.log('Email not sent:', error.message);
  }

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      module: user.module,
      permissions: user.permissions,
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  // Find user by username (name) or email and include password
  const user = await User.findOne({ $or: [ { email: username }, { name: username } ] }).select('+password');

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({ message: 'Account is deactivated' });
  }

  // Validate password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Update last login
  user.lastLogin = new Date();
  user.loginLogs.push({
    loginTime: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  await user.save();

  const token = generateToken(user._id);

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      module: user.module,
      permissions: user.permissions,
      token
    }
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
export const updatePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(req.body.currentPassword);

  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = req.body.newPassword;
  await user.save();

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Password updated successfully',
    token
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash and save to user (you'd add resetPasswordToken and resetPasswordExpire fields to User model)
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
  
  await user.save();

  try {
    await sendPasswordResetEmail(user.email, resetToken);
    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(500).json({ message: 'Email could not be sent' });
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Password reset successful',
    token
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: users
  });
});

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, module, permissions, isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone || user.phone;
  user.role = role || user.role;
  user.module = module || user.module;
  if (permissions) user.permissions = permissions;
  if (typeof isActive !== 'undefined') user.isActive = isActive;

  await user.save();

  res.json({
    success: true,
    data: user,
    message: 'User updated successfully'
  });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Delete associated employee record if exists
  if (user.role !== 'main_admin') {
    await Employee.deleteOne({ userId: user._id });
  }

  // Delete the user
  await user.deleteOne();

  res.json({
    success: true,
    message: 'User account deleted successfully'
  });
});

// @desc    Reset user password (Admin only)
// @route   PUT /api/auth/users/:id/reset-password
// @access  Private/Admin
export const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

// @desc    Make user admin (Super admin only)
// @route   PUT /api/auth/users/:id/make-admin
// @access  Private/Admin
export const makeUserAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.role = 'admin';
  user.module = 'all';
  user.permissions = {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canHandleAccounts: true
  };
  await user.save();

  res.json({
    success: true,
    message: 'User is now an admin',
    data: user
  });
});
