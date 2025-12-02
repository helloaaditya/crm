import VendorPayment from '../models/VendorPayment.js';
import Vendor from '../models/Vendor.js';
import VendorInvoice from '../models/VendorInvoice.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { deleteFromS3 } from '../utils/s3Service.js';

// @desc    Create vendor payment
// @route   POST /api/vendor-payments
// @access  Private (Admin, Manager)
export const createVendorPayment = asyncHandler(async (req, res) => {
  const {
    vendor,
    amount,
    paymentMode,
    referenceNumber,
    poBillNumber,
    poBillDate,
    poBillUrl,
    purpose,
    description,
    materials,
    project,
    isGST,
    gstAmount,
    tdsAmount,
    notes,
    vendorInvoice
  } = req.body;

  // Validate vendor exists
  const vendorDoc = await Vendor.findById(vendor);
  if (!vendorDoc) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  const payment = await VendorPayment.create({
    vendor,
    amount,
    paymentMode,
    referenceNumber,
    poBillNumber,
    poBillDate,
    poBillUrl,
    purpose,
    description,
    materials,
    project,
    isGST,
    gstAmount: gstAmount || 0,
    tdsAmount: tdsAmount || 0,
    notes,
    vendorInvoice,
    createdBy: req.user._id,
    approvedBy: req.user._id,
    approvedDate: new Date()
  });

  // If payment is linked to an invoice, update invoice paid amount
  if (vendorInvoice) {
    const invoice = await VendorInvoice.findById(vendorInvoice);
    if (invoice) {
      // Add payment to invoice payments array if not already there
      if (!invoice.payments.includes(payment._id)) {
        invoice.payments.push(payment._id);
      }
      
      // Recalculate paid amount
      const totalPaid = await VendorPayment.aggregate([
        { $match: { vendorInvoice: invoice._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      invoice.paidAmount = totalPaid[0]?.total || 0;
      await invoice.save();
    }
  }

  // Update vendor outstanding balance (reduce when payment is made)
  vendorDoc.outstandingBalance = Math.max(0, (vendorDoc.outstandingBalance || 0) - amount);
  await vendorDoc.save();

  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Get all vendor payments
// @route   GET /api/vendor-payments
// @access  Private
export const getVendorPayments = asyncHandler(async (req, res) => {
  const { vendor, startDate, endDate, status, purpose } = req.query;

  const query = {};

  if (vendor) query.vendor = vendor;
  if (status) query.status = status;
  if (purpose) query.purpose = purpose;
  
  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) query.paymentDate.$lte = new Date(endDate);
  }

  const payments = await VendorPayment.find(query)
    .populate('vendor', 'vendorId name contactPerson contactNumber')
    .populate('project', 'projectId description')
    .populate('materials.material', 'name unit')
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ paymentDate: -1 });

  res.json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get vendor payment by ID
// @route   GET /api/vendor-payments/:id
// @access  Private
export const getVendorPaymentById = asyncHandler(async (req, res) => {
  const payment = await VendorPayment.findById(req.params.id)
    .populate('vendor', 'vendorId name contactPerson contactNumber address bankDetails')
    .populate('project', 'projectId description customer')
    .populate('materials.material', 'name unit')
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!payment) {
    res.status(404);
    throw new Error('Vendor payment not found');
  }

  res.json({
    success: true,
    data: payment
  });
});

// @desc    Update vendor payment
// @route   PUT /api/vendor-payments/:id
// @access  Private (Admin, Manager)
export const updateVendorPayment = asyncHandler(async (req, res) => {
  let payment = await VendorPayment.findById(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Vendor payment not found');
  }

  payment = await VendorPayment.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('vendor', 'vendorId name');

  res.json({
    success: true,
    data: payment
  });
});

// @desc    Cancel vendor payment
// @route   PUT /api/vendor-payments/:id/cancel
// @access  Private (Admin)
export const cancelVendorPayment = asyncHandler(async (req, res) => {
  const payment = await VendorPayment.findById(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Vendor payment not found');
  }

  if (payment.status === 'cancelled') {
    res.status(400);
    throw new Error('Payment is already cancelled');
  }

  payment.status = 'cancelled';
  payment.notes = req.body.notes || payment.notes;
  await payment.save();

  // Update vendor outstanding balance
  const vendor = await Vendor.findById(payment.vendor);
  if (vendor) {
    vendor.outstandingBalance = (vendor.outstandingBalance || 0) - payment.amount;
    await vendor.save();
  }

  res.json({
    success: true,
    data: payment
  });
});

// @desc    Delete vendor payment
// @route   DELETE /api/vendor-payments/:id
// @access  Private (Admin)
export const deleteVendorPayment = asyncHandler(async (req, res) => {
  const payment = await VendorPayment.findById(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Vendor payment not found');
  }

  // Delete PO Bill from S3 if URL exists
  if (payment.poBillUrl) {
    try {
      const urlParts = payment.poBillUrl.split('.com/');
      if (urlParts.length > 1) {
        const s3Key = urlParts[1];
        console.log('🗑️ Deleting PO Bill from S3:', s3Key);
        await deleteFromS3(s3Key);
        console.log('✅ PO Bill deleted from S3');
      }
    } catch (s3Error) {
      console.error('⚠️ Error deleting PO Bill from S3:', s3Error.message);
    }
  }

  // Update vendor outstanding balance
  const vendor = await Vendor.findById(payment.vendor);
  if (vendor) {
    vendor.outstandingBalance = (vendor.outstandingBalance || 0) - payment.amount;
    await vendor.save();
  }

  // Delete payment from database
  await VendorPayment.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Vendor payment and PO Bill deleted successfully from database and S3',
    data: {}
  });
});

// @desc    Get payment statistics
// @route   GET /api/vendor-payments/stats/summary
// @access  Private
export const getPaymentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, vendor } = req.query;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.paymentDate = {};
    if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
    if (endDate) matchStage.paymentDate.$lte = new Date(endDate);
  }
  if (vendor) matchStage.vendor = vendor;

  const stats = await VendorPayment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalGST: { $sum: '$gstAmount' },
        totalTDS: { $sum: '$tdsAmount' },
        totalNetAmount: { $sum: '$netAmount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);

  res.json({
    success: true,
    data: stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      totalGST: 0,
      totalTDS: 0,
      totalNetAmount: 0,
      completedPayments: 0,
      pendingPayments: 0
    }
  });
});

// @desc    Get vendor-wise payment summary
// @route   GET /api/vendor-payments/stats/by-vendor
// @access  Private
export const getVendorWisePayments = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.paymentDate = {};
    if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
    if (endDate) matchStage.paymentDate.$lte = new Date(endDate);
  }

  const summary = await VendorPayment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$vendor',
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' }
      }
    },
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: '_id',
        as: 'vendorDetails'
      }
    },
    { $unwind: '$vendorDetails' },
    {
      $project: {
        vendorId: '$vendorDetails.vendorId',
        vendorName: '$vendorDetails.name',
        totalPayments: 1,
        totalAmount: 1,
        totalNetAmount: 1
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  res.json({
    success: true,
    count: summary.length,
    data: summary
  });
});

