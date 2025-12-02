import VendorInvoice from '../models/VendorInvoice.js';
import VendorPayment from '../models/VendorPayment.js';
import Vendor from '../models/Vendor.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Create vendor invoice
// @route   POST /api/vendor-invoices
// @access  Private
export const createVendorInvoice = asyncHandler(async (req, res) => {
  const {
    invoiceNumber,
    vendor,
    invoiceDate,
    dueDate,
    amount,
    location,
    invoiceUrl,
    description,
    notes
  } = req.body;

  // Validate vendor exists
  const vendorDoc = await Vendor.findById(vendor);
  if (!vendorDoc) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  const invoice = await VendorInvoice.create({
    invoiceNumber,
    vendor,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    dueDate: dueDate ? new Date(dueDate) : undefined,
    amount,
    location,
    invoiceUrl,
    description,
    notes,
    createdBy: req.user._id
  });

  // Update vendor outstanding balance
  vendorDoc.outstandingBalance = (vendorDoc.outstandingBalance || 0) + amount;
  await vendorDoc.save();

  const populatedInvoice = await VendorInvoice.findById(invoice._id)
    .populate('vendor', 'vendorId name contactPerson contactNumber')
    .populate('createdBy', 'name');

  res.status(201).json({
    success: true,
    data: populatedInvoice
  });
});

// @desc    Get all vendor invoices
// @route   GET /api/vendor-invoices
// @access  Private
export const getVendorInvoices = asyncHandler(async (req, res) => {
  const { vendor, location, status, startDate, endDate, search } = req.query;

  const query = {};

  if (vendor) query.vendor = vendor;
  if (location) query.location = { $regex: location, $options: 'i' };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (startDate || endDate) {
    query.invoiceDate = {};
    if (startDate) query.invoiceDate.$gte = new Date(startDate);
    if (endDate) query.invoiceDate.$lte = new Date(endDate);
  }

  const invoices = await VendorInvoice.find(query)
    .populate('vendor', 'vendorId name contactPerson contactNumber')
    .populate('createdBy', 'name')
    .populate('payments', 'paymentId amount paymentDate')
    .sort({ invoiceDate: -1 });

  // Calculate total outstanding
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.remainder || 0), 0);

  res.json({
    success: true,
    count: invoices.length,
    totalOutstanding,
    data: invoices
  });
});

// @desc    Get vendor invoice by ID
// @route   GET /api/vendor-invoices/:id
// @access  Private
export const getVendorInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await VendorInvoice.findById(req.params.id)
    .populate('vendor', 'vendorId name contactPerson contactNumber bankDetails')
    .populate('createdBy', 'name')
    .populate('payments', 'paymentId amount paymentDate paymentMode referenceNumber');

  if (!invoice) {
    res.status(404);
    throw new Error('Vendor invoice not found');
  }

  res.json({
    success: true,
    data: invoice
  });
});

// @desc    Update vendor invoice
// @route   PUT /api/vendor-invoices/:id
// @access  Private
export const updateVendorInvoice = asyncHandler(async (req, res) => {
  const invoice = await VendorInvoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Vendor invoice not found');
  }

  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    amount,
    location,
    invoiceUrl,
    description,
    notes
  } = req.body;

  // If amount changed, update vendor outstanding balance
  if (amount && amount !== invoice.amount) {
    const vendor = await Vendor.findById(invoice.vendor);
    if (vendor) {
      const difference = amount - invoice.amount;
      vendor.outstandingBalance = (vendor.outstandingBalance || 0) + difference;
      await vendor.save();
    }
  }

  if (invoiceNumber) invoice.invoiceNumber = invoiceNumber;
  if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
  if (dueDate !== undefined) invoice.dueDate = dueDate ? new Date(dueDate) : null;
  if (amount) invoice.amount = amount;
  if (location) invoice.location = location;
  if (invoiceUrl !== undefined) invoice.invoiceUrl = invoiceUrl;
  if (description !== undefined) invoice.description = description;
  if (notes !== undefined) invoice.notes = notes;

  await invoice.save();

  const updatedInvoice = await VendorInvoice.findById(invoice._id)
    .populate('vendor', 'vendorId name contactPerson contactNumber')
    .populate('createdBy', 'name')
    .populate('payments', 'paymentId amount paymentDate');

  res.json({
    success: true,
    data: updatedInvoice
  });
});

// @desc    Delete vendor invoice
// @route   DELETE /api/vendor-invoices/:id
// @access  Private
export const deleteVendorInvoice = asyncHandler(async (req, res) => {
  const invoice = await VendorInvoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Vendor invoice not found');
  }

  // Update vendor outstanding balance
  const vendor = await Vendor.findById(invoice.vendor);
  if (vendor) {
    vendor.outstandingBalance = Math.max(0, (vendor.outstandingBalance || 0) - invoice.amount);
    await vendor.save();
  }

  await VendorInvoice.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Vendor invoice deleted successfully'
  });
});

// @desc    Link payment to invoice
// @route   POST /api/vendor-invoices/:id/link-payment
// @access  Private
export const linkPaymentToInvoice = asyncHandler(async (req, res) => {
  const { paymentId } = req.body;

  const invoice = await VendorInvoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error('Vendor invoice not found');
  }

  const payment = await VendorPayment.findById(paymentId);
  if (!payment) {
    res.status(404);
    throw new Error('Vendor payment not found');
  }

  // Check if payment is already linked to another invoice
  if (payment.vendorInvoice && payment.vendorInvoice.toString() !== invoice._id.toString()) {
    res.status(400);
    throw new Error('Payment is already linked to another invoice');
  }

  // Link payment to invoice
  payment.vendorInvoice = invoice._id;
  await payment.save();

  // Add payment to invoice payments array if not already there
  if (!invoice.payments.includes(payment._id)) {
    invoice.payments.push(payment._id);
  }

  // Update invoice paid amount and remainder
  const totalPaid = await VendorPayment.aggregate([
    { $match: { vendorInvoice: invoice._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  invoice.paidAmount = totalPaid[0]?.total || 0;
  await invoice.save();

  const updatedInvoice = await VendorInvoice.findById(invoice._id)
    .populate('vendor', 'vendorId name contactPerson contactNumber')
    .populate('payments', 'paymentId amount paymentDate paymentMode');

  res.json({
    success: true,
    data: updatedInvoice
  });
});

// @desc    Get outstanding invoices summary
// @route   GET /api/vendor-invoices/stats/outstanding
// @access  Private
export const getOutstandingInvoices = asyncHandler(async (req, res) => {
  const { vendor } = req.query;

  const query = {
    status: { $in: ['pending', 'partial', 'overdue'] }
  };

  if (vendor) query.vendor = vendor;

  const invoices = await VendorInvoice.find(query)
    .populate('vendor', 'vendorId name')
    .select('invoiceNumber vendor amount remainder location status invoiceDate dueDate')
    .sort({ dueDate: 1 });

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.remainder || 0), 0);

  // Group by vendor
  const byVendor = {};
  invoices.forEach(inv => {
    const vendorId = inv.vendor._id.toString();
    if (!byVendor[vendorId]) {
      byVendor[vendorId] = {
        vendor: inv.vendor,
        invoices: [],
        totalOutstanding: 0
      };
    }
    byVendor[vendorId].invoices.push(inv);
    byVendor[vendorId].totalOutstanding += inv.remainder || 0;
  });

  res.json({
    success: true,
    totalOutstanding,
    count: invoices.length,
    byVendor: Object.values(byVendor),
    data: invoices
  });
});

