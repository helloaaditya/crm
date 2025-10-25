import Invoice from '../models/Invoice.js';
import Material from '../models/Material.js';
import Project from '../models/Project.js';
import Payment from '../models/Payment.js';
import InvoiceSettings from '../models/InvoiceSettings.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateInvoicePDF } from '../utils/pdfService.js';
import { sendInvoiceEmail } from '../utils/emailService.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../utils/razorpayService.js';

// =============== INVOICES ===============

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = asyncHandler(async (req, res) => {
  const { search, status, paymentStatus, page = 1, limit = 10 } = req.query;

  let query = {};

  if (search) {
    query.invoiceNumber = { $regex: search, $options: 'i' };
  }

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const invoices = await Invoice.find(query)
    .populate('customer', 'name contactNumber email')
    .populate('project', 'projectId description')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Invoice.countDocuments(query);

  res.json({
    success: true,
    data: invoices,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count
  });
});

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('customer')
    .populate('project')
    .populate('createdBy', 'name');

  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  res.json({
    success: true,
    data: invoice
  });
});

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoice = asyncHandler(async (req, res) => {
  const { 
    customer, 
    project, 
    invoiceType, 
    isGST, 
    gstNumber, 
    items, 
    subtotal, 
    cgst, 
    sgst, 
    igst, 
    discount, 
    totalAmount, 
    dueDate, 
    terms, 
    notes 
  } = req.body;

  // Validate required fields
  if (!customer) {
    return res.status(400).json({ message: 'Customer is required' });
  }

  // Validate items
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'At least one item is required' });
  }

  // Validate stock availability before creating invoice
  const stockValidationErrors = [];
  for (const item of items) {
    if (item.material) {
      try {
        const material = await Material.findById(item.material);
        if (material) {
          // Check if sufficient stock
          if (material.quantity < item.quantity) {
            stockValidationErrors.push(`Insufficient stock for ${material.name}. Available: ${material.quantity} ${material.unit}, Required: ${item.quantity} ${material.unit}`);
          }
        } else {
          stockValidationErrors.push(`Material not found for item`);
        }
      } catch (error) {
        console.error('Error checking stock:', error);
        stockValidationErrors.push(`Error checking stock for material`);
      }
    }
  }

  // If there are stock validation errors, return them
  if (stockValidationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Stock validation failed',
      errors: stockValidationErrors
    });
  }

  // Generate invoice number
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  
  // Find the highest invoice number for this month
  const lastInvoice = await Invoice.findOne({
    invoiceNumber: { $regex: `^INV${year}${month}` }
  })
  .sort({ invoiceNumber: -1 })
  .select('invoiceNumber')
  .lean();

  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.substring(5));
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  const invoiceNumber = `INV${year}${month}${nextNumber.toString().padStart(4, '0')}`;

  // Create invoice
  const invoice = await Invoice.create({
    invoiceNumber,
    customer,
    project,
    invoiceType,
    isGST,
    gstNumber,
    items,
    subtotal,
    cgst,
    sgst,
    igst,
    discount,
    totalAmount,
    dueDate,
    terms,
    notes,
    createdBy: req.user._id
  });

  // Auto-deduct stock for items with materials
  for (const item of items) {
    if (item.material) {
      try {
        const material = await Material.findById(item.material);
        if (material) {
          // Check if sufficient stock (double-check)
          if (material.quantity >= item.quantity) {
            // Deduct stock
            material.quantity -= item.quantity;
            
            // Add stock history entry
            material.stockHistory.push({
              type: 'outward',
              quantity: -item.quantity, // Negative for outward
              balanceAfter: material.quantity,
              reference: invoice.invoiceNumber,
              project: project || null,
              invoice: invoice._id,
              customer: customer,
              notes: `Used in invoice ${invoice.invoiceNumber}`,
              handledBy: req.user._id
            });
            
            await material.save();
            
            // Mark item as stock deducted
            const invoiceItem = invoice.items.find(i => i.material?.toString() === item.material);
            if (invoiceItem) {
              invoiceItem.stockDeducted = true;
            }
          } else {
            console.warn(`Insufficient stock for material ${material.name}. Available: ${material.quantity}, Required: ${item.quantity}`);
          }
        }
      } catch (error) {
        console.error('Error deducting stock:', error);
      }
    }
  }

  // Sync with project if exists
  if (project) {
    try {
      const linkedProject = await Project.findById(project);
      if (linkedProject) {
        linkedProject.invoiceGenerated = true;
        linkedProject.invoice = invoice._id;
        
        // Update final cost with invoice total
        linkedProject.finalCost = totalAmount;
        
        // Add activity log
        linkedProject.activityLog.push({
          action: 'invoice_generated',
          description: `Invoice ${invoice.invoiceNumber} generated for ₹${totalAmount}`,
          oldAmount: linkedProject.finalCost,
          newAmount: totalAmount 
        });
        await linkedProject.save();
      }
    } catch (error) {
      console.error('Error syncing invoice with project:', error);
    }
  }

  await invoice.save();

  res.status(201).json({
    success: true,
    data: invoice
  });
});

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  // Prevent updating paid invoices
  if (invoice.paymentStatus === 'paid') {
    return res.status(400).json({ message: 'Cannot update paid invoice' });
  }

  const { 
    customer, 
    project, 
    invoiceType, 
    isGST, 
    gstNumber, 
    items, 
    subtotal, 
    cgst, 
    sgst, 
    igst, 
    discount, 
    totalAmount, 
    dueDate, 
    terms, 
    notes 
  } = req.body;

  // Update invoice
  invoice.customer = customer || invoice.customer;
  invoice.project = project || invoice.project;
  invoice.invoiceType = invoiceType || invoice.invoiceType;
  invoice.isGST = isGST !== undefined ? isGST : invoice.isGST;
  invoice.gstNumber = gstNumber || invoice.gstNumber;
  invoice.items = items || invoice.items;
  invoice.subtotal = subtotal || invoice.subtotal;
  invoice.cgst = cgst || invoice.cgst;
  invoice.sgst = sgst || invoice.sgst;
  invoice.igst = igst || invoice.igst;
  invoice.discount = discount || invoice.discount;
  invoice.totalAmount = totalAmount || invoice.totalAmount;
  invoice.dueDate = dueDate || invoice.dueDate;
  invoice.terms = terms || invoice.terms;
  invoice.notes = notes || invoice.notes;

  await invoice.save();

  // Sync with project if exists and amount changed
  if (project && totalAmount !== invoice.totalAmount) {
    try {
      const linkedProject = await Project.findById(project);
      if (linkedProject) {
        const oldTotalAmount = linkedProject.finalCost;
        
        // Update final cost with new invoice total
        linkedProject.finalCost = totalAmount;
        
        // Add activity log
        linkedProject.activityLog.push({
          action: 'invoice_updated',
          description: `Invoice updated from ₹${oldTotalAmount} to ₹${totalAmount}`,
          oldAmount: oldTotalAmount,
          newAmount: totalAmount 
        });
        await linkedProject.save();
      }
    } catch (error) {
      console.error('Error syncing updated invoice with project:', error);
    }
  }

  res.json({
    success: true,
    data: invoice
  });
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  // Set invoice status to cancelled
  invoice.status = 'cancelled';
  
  // Also update payment status to avoid showing in unpaid counts
  invoice.paymentStatus = 'cancelled';
  
  await invoice.save();

  res.json({
    success: true,
    message: 'Invoice cancelled successfully'
  });
});

// @desc    Generate/Download invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
export const generateInvoicePDFFile = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('customer');

  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  // Get invoice settings
  const invoiceSettings = await InvoiceSettings.getSettings();

  const invoiceData = {
    // Company Information from settings
    companyInfo: invoiceSettings.companyInfo,
    bankDetails: invoiceSettings.bankDetails,
    invoiceDefaults: invoiceSettings.invoiceDefaults,
    qrCode: invoiceSettings.qrCode,
    
    // Invoice Information
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customer.name,
    customerPhone: invoice.customer.contactNumber,
    customerEmail: invoice.customer.email,
    customerAddress: invoice.customer.address,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    items: invoice.items,
    subtotal: invoice.subtotal,
    cgst: invoice.cgst,
    sgst: invoice.sgst,
    igst: invoice.igst,
    discount: invoice.discount,
    totalAmount: invoice.totalAmount,
    isGST: invoice.isGST,
    gstNumber: invoice.gstNumber,
    terms: invoice.terms
  };

  const pdf = await generateInvoicePDF(invoiceData, 'invoice');

  // Generate full URL for PDF (backend URL + path)
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  invoice.pdfUrl = `${backendUrl}/uploads/invoices/${pdf.filename}`;
  await invoice.save();

  res.json({
    success: true,
    data: {
      pdfUrl: invoice.pdfUrl
    }
  });
});

// @desc    Send invoice via email
// @route   POST /api/invoices/:id/send-email
// @access  Private
export const sendInvoiceViaEmail = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('customer');

  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  if (!invoice.pdfUrl) {
    return res.status(400).json({ message: 'Generate PDF first' });
  }

  try {
    const result = await sendInvoiceEmail(invoice.customer.email, invoice, invoice.pdfUrl);
    
    // Check if email was skipped due to missing configuration
    if (result && result.skipped) {
      return res.status(200).json({
        success: true,
        message: 'Email service not configured. Invoice PDF is available for download.',
        warning: 'To enable email sending, configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env file'
      });
    }

    invoice.status = 'sent';
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice sent successfully'
    });
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invoice email. PDF is still available for download.',
      error: error.message
    });
  }
});

// =============== PAYMENTS ===============

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find()
    .populate('invoice', 'invoiceNumber customer')
    .populate('customer', 'name contactNumber')
    .populate('recordedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: payments
  });
});

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('invoice', 'invoiceNumber customer')
    .populate('customer', 'name contactNumber')
    .populate('recordedBy', 'name');

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  res.json({
    success: true,
    data: payment
  });
});

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { invoiceId, amount } = req.body;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  const order = await createRazorpayOrder(
    amount,
    'INR',
    `INV-${invoice.invoiceNumber}`
  );

  res.json({
    success: true,
    data: order
  });
});

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Private
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, amount } = req.body;

  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  if (!isValid) {
    return res.status(400).json({ message: 'Payment verification failed' });
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  // Record payment
  const payment = await Payment.create({
    invoice: invoiceId,
    customer: invoice.customer,
    amount,
    paymentMethod: 'razorpay',
    transactionId: razorpay_payment_id,
    razorpay: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    },
    status: 'success',
    recordedBy: req.user._id
  });

  // Update invoice
  invoice.paidAmount += amount;
  invoice.payments.push(payment._id);
  
  // Automatically update invoice status based on payment status
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'paid';
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'partial';
  }
  
  await invoice.save();

  res.json({
    success: true,
    message: 'Payment verified successfully',
    data: payment
  });
});

// @desc    Record manual payment
// @route   POST /api/payments/manual
// @access  Private
export const recordManualPayment = asyncHandler(async (req, res) => {
  const { invoiceId, amount, paymentMethod, transactionId, notes } = req.body;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  // Record payment
  const payment = await Payment.create({
    invoice: invoiceId,
    customer: invoice.customer,
    amount,
    paymentMethod,
    transactionId,
    notes,
    status: 'success',
    recordedBy: req.user._id
  });

  // Update invoice
  invoice.paidAmount += amount;
  invoice.payments.push(payment._id);
  
  // Automatically update invoice status based on payment status
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'paid';
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'partial';
  }
  
  await invoice.save();

  res.json({
    success: true,
    message: 'Manual payment recorded successfully',
    data: payment
  });
});