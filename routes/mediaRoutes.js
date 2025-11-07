import express from 'express';
import { proxyS3Media, uploadVendorDocument } from '../controllers/mediaController.js';
import { protect } from '../middleware/auth.js';
import { uploadMemory } from '../middleware/upload.js';

const router = express.Router();

// Media proxy doesn't require authentication since HTML <audio>/<img> tags can't send auth headers
// The S3 URLs themselves are secure (signed/private) and already validated on upload
router.get('/proxy', proxyS3Media);

// Upload vendor PO bills and documents
router.post('/upload/vendor-po', protect, uploadMemory.single('file'), uploadVendorDocument);

// Upload employee documents
router.post('/upload/employee-document', protect, uploadMemory.single('file'), uploadVendorDocument); // Reusing the same function

// Upload work order documents
router.post('/upload/work-order-doc', protect, uploadMemory.single('file'), uploadVendorDocument); // Reusing the same function

// Upload company documents
router.post('/upload/company-doc', protect, uploadMemory.single('file'), uploadVendorDocument); // Reusing the same function

export default router;


