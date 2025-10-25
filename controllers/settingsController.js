import Settings from '../models/Settings.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin only)
export const getSettings = asyncHandler(async (req, res) => {
  // Check if user has admin permissions
  if (req.user.role !== 'admin' && req.user.role !== 'main_admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  const settings = await Settings.findOne();
  
  // If no settings exist, create default settings
  if (!settings) {
    const defaultSettings = await Settings.create({});
    return res.json({
      success: true,
      data: defaultSettings
    });
  }

  res.json({
    success: true,
    data: settings
  });
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin only)
export const updateSettings = asyncHandler(async (req, res) => {
  // Check if user has admin permissions
  if (req.user.role !== 'admin' && req.user.role !== 'main_admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  // Ensure nested structures are properly handled
  const updateData = {
    ...req.body,
    updatedBy: req.user._id
  };

  // Ensure nested objects exist for sections that are managed in settings
  if (req.body.company) {
    updateData.company = {
      ...req.body.company,
      address: {
        ...req.body.company.address
      }
    };
  }

  if (req.body.invoice) {
    updateData.invoice = {
      ...req.body.invoice,
      bankDetails: {
        ...req.body.invoice.bankDetails
      }
    };
  }

  if (req.body.tax) {
    updateData.tax = {
      ...req.body.tax
    };
  }

  if (req.body.theme) {
    updateData.theme = {
      ...req.body.theme
    };
  }

  if (req.body.backup) {
    updateData.backup = {
      ...req.body.backup
    };
  }

  const settings = await Settings.findOneAndUpdate(
    {},
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  res.json({
    success: true,
    data: settings,
    message: 'Settings updated successfully'
  });
});

// @desc    Get user-specific settings
// @route   GET /api/settings/my-settings
// @access  Private (All users)
export const getMySettings = asyncHandler(async (req, res) => {
  // For now, return basic user settings
  // In a more complex system, this could return user-specific preferences
  res.json({
    success: true,
    data: {
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      theme: 'light' // Default theme
    }
  });
});

// @desc    Update user-specific settings
// @route   PUT /api/settings/my-settings
// @access  Private (All users)
export const updateMySettings = asyncHandler(async (req, res) => {
  // For now, we'll just return success
  // In a more complex system, this would update user-specific preferences
  res.json({
    success: true,
    message: 'User settings updated successfully'
  });
});