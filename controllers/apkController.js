import Settings from '../models/Settings.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get APK info
// @route   GET /api/apk
// @access  Public (for download)
export const getApkInfo = asyncHandler(async (req, res) => {
  try {
    const settings = await Settings.findOne();
    
    if (!settings || !settings.apk || !settings.apk.filePath) {
      return res.status(404).json({
        success: false,
        message: 'APK file not found'
      });
    }

    const filePath = path.join(__dirname, '..', settings.apk.filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'APK file not found on server'
      });
    }

    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      data: {
        fileName: settings.apk.fileName,
        version: settings.apk.version,
        fileSize: settings.apk.fileSize || stats.size,
        uploadedAt: settings.apk.uploadedAt,
        downloadUrl: `/api/apk/download`
      }
    });
  } catch (error) {
    console.error('Error fetching APK info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch APK info',
      error: error.message
    });
  }
});

// @desc    Download APK file
// @route   GET /api/apk/download
// @access  Public
export const downloadApk = asyncHandler(async (req, res) => {
  try {
    const settings = await Settings.findOne();
    
    if (!settings || !settings.apk || !settings.apk.filePath) {
      return res.status(404).json({
        success: false,
        message: 'APK file not found'
      });
    }

    const filePath = path.join(__dirname, '..', settings.apk.filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'APK file not found on server'
      });
    }

    const fileName = settings.apk.fileName || 'sanjana-crm.apk';
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading APK:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download APK',
      error: error.message
    });
  }
});

// @desc    Upload APK file
// @route   POST /api/apk/upload
// @access  Private (Admin only)
export const uploadApk = asyncHandler(async (req, res) => {
  // Check if user has admin permissions
  if (req.user.role !== 'admin' && req.user.role !== 'main_admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin rights required.' 
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No APK file uploaded'
    });
  }

  try {
    // Get version from request body or extract from filename
    const version = req.body.version || '1.0.0';
    
    // Get or create settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    // Delete old APK file if exists
    if (settings.apk && settings.apk.filePath) {
      const oldFilePath = path.join(__dirname, '..', settings.apk.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update settings with new APK info
    settings.apk = {
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      version: version,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };

    await settings.save();

    res.json({
      success: true,
      data: {
        fileName: settings.apk.fileName,
        version: settings.apk.version,
        fileSize: settings.apk.fileSize,
        uploadedAt: settings.apk.uploadedAt,
        downloadUrl: `/api/apk/download`
      },
      message: 'APK file uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading APK:', error);
    
    // Delete uploaded file if settings update failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.error('Error deleting uploaded file:', deleteError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload APK',
      error: error.message
    });
  }
});

