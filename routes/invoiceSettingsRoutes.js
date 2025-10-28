import express from 'express';
import { protect, checkPermission } from '../middleware/auth.js';
import InvoiceSettings from '../models/InvoiceSettings.js';
import Settings from '../models/Settings.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import multer from 'multer';
import { uploadBufferToS3 } from '../utils/s3Service.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public ping to verify route is mounted in production
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'invoice-settings route mounted' });
});

router.use(protect);

// @desc    Get invoice settings
// @route   GET /api/invoice-settings
// @access  Private (Admin only)
router.get('/', checkPermission('canEdit'), asyncHandler(async (req, res) => {
  const settings = await InvoiceSettings.getSettings();
  res.json({
    success: true,
    data: settings
  });
}));

// @desc    Update invoice settings
// @route   PUT /api/invoice-settings
// @access  Private (Admin only)
router.put('/', checkPermission('canEdit'), asyncHandler(async (req, res) => {
  const updateData = {
    ...req.body,
    updatedBy: req.user._id
  };

  const settings = await InvoiceSettings.findOneAndUpdate(
    {},
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  res.json({
    success: true,
    data: settings,
    message: 'Invoice settings updated successfully'
  });
}));

// @desc    Upload logo image to S3 and return URL
// @route   POST /api/invoice-settings/upload-logo
// @access  Private (Admin only)
router.post('/upload-logo', checkPermission('canEdit'), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const ext = req.file.originalname.split('.').pop()?.toLowerCase();
  const allowed = ['png', 'jpg', 'jpeg', 'webp'];
  if (!allowed.includes(ext)) {
    return res.status(400).json({ success: false, message: 'Unsupported file type' });
  }

  const key = `logos/${Date.now()}-${req.file.originalname}`;
  const uploaded = await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
  return res.json({ success: true, data: { url: uploaded.url, key: uploaded.key } });
}));

// @desc    Sync from general Settings (one-time convenience)
// @route   POST /api/invoice-settings/sync-from-settings
// @access  Private (Admin only)
router.post('/sync-from-settings', checkPermission('canEdit'), asyncHandler(async (req, res) => {
  const base = await Settings.findOne();
  if (!base) {
    return res.status(404).json({ success: false, message: 'General settings not found' });
  }

  const updateData = {
    companyInfo: {
      name: base.company?.name,
      logoUrl: base.company?.logo,
      address: base.company?.address?.street,
      city: base.company?.address?.city,
      state: base.company?.address?.state,
      pincode: base.company?.address?.pincode,
      phone: base.company?.phone,
      email: base.company?.email,
      gstin: base.company?.gstNumber,
      pan: base.company?.panNumber
    },
    bankDetails: {
      bankName: base.invoice?.bankDetails?.bankName,
      accountNumber: base.invoice?.bankDetails?.accountNumber,
      ifscCode: base.invoice?.bankDetails?.ifscCode,
      accountName: base.invoice?.bankDetails?.accountHolderName,
      branch: base.invoice?.bankDetails?.branch
    },
    invoiceDefaults: {
      prefix: base.invoice?.prefix,
      terms: base.invoice?.terms,
      dateFormat: 'DD/MM/YYYY'
    },
    updatedBy: req.user._id
  };

  const settings = await InvoiceSettings.findOneAndUpdate(
    {},
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  res.json({ success: true, data: settings, message: 'Invoice settings synced from general settings' });
}));

export default router;
