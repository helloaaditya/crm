import CompanyDocument from '../models/CompanyDocument.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Upload/Create company document
// @route   POST /api/company-documents
// @access  Private
export const createCompanyDocument = asyncHandler(async (req, res) => {
  const document = await CompanyDocument.create({
    ...req.body,
    uploadedBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: document
  });
});

// @desc    Get all company documents
// @route   GET /api/company-documents
// @access  Private
export const getCompanyDocuments = asyncHandler(async (req, res) => {
  const { 
    category, 
    status, 
    documentType, 
    accessLevel, 
    tags,
    search 
  } = req.query;

  const query = {};

  if (category) query.category = category;
  if (status) query.status = status;
  if (documentType) query.documentType = documentType;
  if (accessLevel) query.accessLevel = accessLevel;
  if (tags) query.tags = { $in: tags.split(',') };

  // Search in name and description
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by user role access
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    query.$or = [
      { accessLevel: 'public' },
      { accessLevel: 'internal' },
      { allowedRoles: { $in: [req.user.role, 'all'] } }
    ];
  }

  const documents = await CompanyDocument.find(query)
    .populate('uploadedBy', 'name')
    .populate('verifiedBy', 'name')
    .populate('lastAccessedBy', 'name')
    .sort({ uploadDate: -1 });

  res.json({
    success: true,
    count: documents.length,
    data: documents
  });
});

// @desc    Get document by ID
// @route   GET /api/company-documents/:id
// @access  Private
export const getCompanyDocumentById = asyncHandler(async (req, res) => {
  const document = await CompanyDocument.findById(req.params.id)
    .populate('uploadedBy', 'name email')
    .populate('verifiedBy', 'name email')
    .populate('lastAccessedBy', 'name email')
    .populate('comments.createdBy', 'name');

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  // Update last accessed
  document.lastAccessedBy = req.user._id;
  document.lastAccessedDate = new Date();
  document.downloadCount += 1;
  await document.save();

  res.json({
    success: true,
    data: document
  });
});

// @desc    Update company document
// @route   PUT /api/company-documents/:id
// @access  Private
export const updateCompanyDocument = asyncHandler(async (req, res) => {
  let document = await CompanyDocument.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  // If URL is being updated, save previous version
  if (req.body.url && req.body.url !== document.url) {
    document.previousVersions.push({
      version: document.version,
      url: document.url,
      uploadDate: document.uploadDate,
      uploadedBy: document.uploadedBy,
      notes: req.body.versionNotes || 'Updated document'
    });
    document.version += 1;
  }

  document = await CompanyDocument.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('uploadedBy verifiedBy');

  res.json({
    success: true,
    data: document
  });
});

// @desc    Delete/Archive company document
// @route   DELETE /api/company-documents/:id
// @access  Private (Admin)
export const deleteCompanyDocument = asyncHandler(async (req, res) => {
  const document = await CompanyDocument.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  document.status = 'deleted';
  await document.save();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Verify document
// @route   PUT /api/company-documents/:id/verify
// @access  Private (Admin, Manager)
export const verifyDocument = asyncHandler(async (req, res) => {
  const document = await CompanyDocument.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  document.isVerified = true;
  document.verifiedBy = req.user._id;
  document.verifiedDate = new Date();
  await document.save();

  res.json({
    success: true,
    data: document
  });
});

// @desc    Add comment to document
// @route   POST /api/company-documents/:id/comments
// @access  Private
export const addDocumentComment = asyncHandler(async (req, res) => {
  const { text } = req.body;

  const document = await CompanyDocument.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  document.comments.push({
    text,
    createdBy: req.user._id,
    createdAt: new Date()
  });

  await document.save();

  res.json({
    success: true,
    data: document
  });
});

// @desc    Get documents by category
// @route   GET /api/company-documents/category/:category
// @access  Private
export const getDocumentsByCategory = asyncHandler(async (req, res) => {
  const documents = await CompanyDocument.find({
    category: req.params.category,
    status: { $ne: 'deleted' }
  })
    .populate('uploadedBy', 'name')
    .sort({ uploadDate: -1 });

  res.json({
    success: true,
    count: documents.length,
    data: documents
  });
});

// @desc    Get document statistics
// @route   GET /api/company-documents/stats/summary
// @access  Private
export const getDocumentStats = asyncHandler(async (req, res) => {
  const stats = await CompanyDocument.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const statusStats = await CompanyDocument.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      byCategory: stats,
      byStatus: statusStats
    }
  });
});

// @desc    Search documents
// @route   GET /api/company-documents/search
// @access  Private
export const searchDocuments = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    res.status(400);
    throw new Error('Please provide a search query');
  }

  const documents = await CompanyDocument.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } }
    ],
    status: { $ne: 'deleted' }
  })
    .populate('uploadedBy', 'name')
    .limit(50)
    .sort({ uploadDate: -1 });

  res.json({
    success: true,
    count: documents.length,
    data: documents
  });
});

