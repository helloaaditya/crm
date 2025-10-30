import Invoice from '../models/Invoice.js';
import Material from '../models/Material.js';
import Project from '../models/Project.js';
import Payment from '../models/Payment.js';
import InvoiceSettings from '../models/InvoiceSettings.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateInvoicePDF } from '../utils/pdfService.js';
import fs from 'fs';
import { uploadFilePathToS3 } from '../utils/s3Service.js';
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

  // Get default terms from settings if not provided
  let invoiceTerms = terms;
  if (!invoiceTerms) {
    try {
      const invoiceSettings = await InvoiceSettings.getSettings();
      invoiceTerms = invoiceSettings.invoiceDefaults?.terms || 
        '1. Payment terms are 30 days from invoice date.\n' +
        '2. Interest @ 24% per annum will be charged on overdue amounts.\n' +
        '3. All disputes subject to Bangalore jurisdiction.';
    } catch (error) {
      console.error('Error getting invoice settings:', error);
      // Use default terms if settings unavailable
      invoiceTerms = 
        '1. Payment terms are 30 days from invoice date.\n' +
        '2. Interest @ 24% per annum will be charged on overdue amounts.\n' +
        '3. All disputes subject to Bangalore jurisdiction.';
    }
  }

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
    terms: invoiceTerms,
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
  
  // Use default terms from settings if not provided
  if (terms !== undefined) {
    invoice.terms = terms;
  } else if (!invoice.terms) {
    try {
      const invoiceSettings = await InvoiceSettings.getSettings();
      invoice.terms = invoiceSettings.invoiceDefaults?.terms || 
        '1. Payment terms are 30 days from invoice date.\n' +
        '2. Interest @ 24% per annum will be charged on overdue amounts.\n' +
        '3. All disputes subject to Bangalore jurisdiction.';
    } catch (error) {
      console.error('Error getting invoice settings:', error);
      // Use default terms if settings unavailable
      invoice.terms = 
        '1. Payment terms are 30 days from invoice date.\n' +
        '2. Interest @ 24% per annum will be charged on overdue amounts.\n' +
        '3. All disputes subject to Bangalore jurisdiction.';
    }
  }
  
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

  // Auto-restock materials if invoice had materials
  let restockResults = null;
  if (invoice.items && invoice.items.length > 0) {
    try {
      const materialsToRestock = invoice.items
        .filter(item => item.material && item.quantity)
        .map(item => ({
          materialId: item.material,
          quantity: item.quantity,
          materialName: item.name || 'Unknown Material'
        }));

      if (materialsToRestock.length > 0) {
        // Call the auto-restock function
        const restockResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/inventory/materials/auto-restock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.customer,
            projectId: invoice.project,
            materials: materialsToRestock,
            handledBy: req.user._id
          })
        });

        if (restockResponse.ok) {
          restockResults = await restockResponse.json();
          console.log('Auto-restock completed:', restockResults.data);
        } else {
          console.error('Auto-restock failed:', await restockResponse.text());
        }
      }
    } catch (error) {
      console.error('Error during auto-restock:', error);
      // Don't fail the invoice cancellation if restock fails
    }
  }

  res.json({
    success: true,
    message: 'Invoice cancelled successfully',
    data: {
      invoice: invoice,
      restockResults: restockResults?.data || null
    }
  });
});

// @desc    Generate/Download invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
export const generateInvoicePDFFile = asyncHandler(async (req, res) => {
  console.log('PDF generation request for invoice ID:', req.params.id);
  
  const invoice = await Invoice.findById(req.params.id)
    .populate('customer')
    .populate('project');

  if (!invoice) {
    console.log('Invoice not found for ID:', req.params.id);
    return res.status(404).json({ message: 'Invoice not found' });
  }

  console.log('Found invoice:', {
    id: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    customer: invoice.customer?.name,
    totalAmount: invoice.totalAmount,
    itemsCount: invoice.items?.length,
    existingPdfUrl: invoice.pdfUrl
  });

  // Check if PDF already exists (unless force regenerate is requested)
  const forceRegenerate = req.query.force === 'true';
  
  if (invoice.pdfUrl && !forceRegenerate) {
    console.log('PDF already exists for invoice:', invoice.invoiceNumber, 'URL:', invoice.pdfUrl);
    
    // Verify the PDF URL is still accessible
    try {
      // For S3 URLs, we can assume they're accessible
      if (invoice.pdfUrl.includes('amazonaws.com') || invoice.pdfUrl.includes('s3')) {
        console.log('S3 PDF URL found, returning existing PDF');
        return res.json({ 
          success: true, 
          data: { 
            pdfUrl: invoice.pdfUrl,
            filename: invoice.pdfUrl.split('/').pop(),
            cached: true
          } 
        });
      }
      
      // For local URLs, check if file exists
      if (invoice.pdfUrl.includes('/uploads/invoices/')) {
        const filename = invoice.pdfUrl.split('/').pop();
        const filePath = `uploads/invoices/${filename}`;
        
        if (fs.existsSync(filePath)) {
          console.log('Local PDF file found, returning existing PDF');
          return res.json({ 
            success: true, 
            data: { 
              pdfUrl: invoice.pdfUrl,
              filename: filename,
              cached: true
            } 
          });
        } else {
          console.log('Local PDF file not found, will regenerate');
        }
      }
    } catch (error) {
      console.log('Error checking existing PDF, will regenerate:', error.message);
    }
  } else if (forceRegenerate) {
    console.log('Force regenerate requested for invoice:', invoice.invoiceNumber);
  }

  // Get invoice settings with fallback to general settings
  let invoiceSettings;
  try {
    invoiceSettings = await InvoiceSettings.getSettings();
  } catch (error) {
    console.log('InvoiceSettings not found, using empty settings');
    invoiceSettings = {
      companyInfo: {},
      bankDetails: {},
      invoiceDefaults: {},
      qrCode: { enabled: false },
      theme: {}
    };
  }

  // Ensure we have valid data for PDF generation
  const invoiceData = {
    // Company Information from settings (with fallbacks)
    companyInfo: {
      name: invoiceSettings.companyInfo?.name || 'Your Company Name',
      address: invoiceSettings.companyInfo?.address || 'Your Company Address',
      city: invoiceSettings.companyInfo?.city || 'Your City',
      state: invoiceSettings.companyInfo?.state || 'Your State',
      pincode: invoiceSettings.companyInfo?.pincode || 'Your Pincode',
      phone: invoiceSettings.companyInfo?.phone || 'Your Phone',
      email: invoiceSettings.companyInfo?.email || 'Your Email',
      gstin: invoiceSettings.companyInfo?.gstin || '',
      pan: invoiceSettings.companyInfo?.pan || '',
      logoUrl: invoiceSettings.companyInfo?.logoUrl || ''
    },
    bankDetails: {
      bankName: invoiceSettings.bankDetails?.bankName || '',
      accountName: invoiceSettings.bankDetails?.accountName || '',
      accountNumber: invoiceSettings.bankDetails?.accountNumber || '',
      ifscCode: invoiceSettings.bankDetails?.ifscCode || '',
      branch: invoiceSettings.bankDetails?.branch || '',
      upiId: invoiceSettings.bankDetails?.upiId || ''
    },
    invoiceDefaults: {
      terms: invoiceSettings.invoiceDefaults?.terms || 'Thank you for your business!',
      notes: invoiceSettings.invoiceDefaults?.notes || '',
      prefix: invoiceSettings.invoiceDefaults?.prefix || 'INV',
      dateFormat: invoiceSettings.invoiceDefaults?.dateFormat || 'DD/MM/YYYY'
    },
    qrCode: {
      enabled: invoiceSettings.qrCode?.enabled || false,
      includeAmount: invoiceSettings.qrCode?.includeAmount || false,
      size: invoiceSettings.qrCode?.size || 80
    },
    theme: {
      primaryColor: invoiceSettings.theme?.primaryColor || '#1e40af',
      secondaryColor: invoiceSettings.theme?.secondaryColor || '#374151',
      accentColor: invoiceSettings.theme?.accentColor || '#f3f4f6',
      fontSizes: invoiceSettings.theme?.fontSizes || {},
      logo: invoiceSettings.theme?.logo || {},
      layout: invoiceSettings.theme?.layout || {}
    },
    
    // Invoice Information (from database)
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customer?.name || 'Customer Name',
    customerPhone: invoice.customer?.contactNumber || '',
    customerEmail: invoice.customer?.email || '',
    customerAddress: invoice.customer?.address || '',
    invoiceDate: invoice.invoiceDate || new Date(),
    dueDate: invoice.dueDate,
    items: invoice.items || [],
    subtotal: invoice.subtotal || 0,
    cgst: invoice.cgst || 0,
    sgst: invoice.sgst || 0,
    igst: invoice.igst || 0,
    discount: invoice.discount || 0,
    totalAmount: invoice.totalAmount || 0,
    isGST: invoice.isGST || false,
    gstNumber: invoice.gstNumber || '',
    terms: invoice.terms || invoiceSettings.invoiceDefaults?.terms || 'Thank you for your business!'
  };

  console.log('Generating PDF with data:', {
    invoiceNumber: invoiceData.invoiceNumber,
    customerName: invoiceData.customerName,
    totalAmount: invoiceData.totalAmount,
    companyName: invoiceData.companyInfo.name,
    hasQRCode: invoiceData.qrCode.enabled,
    upiId: invoiceData.bankDetails.upiId
  });

  // If external provider enabled, construct a download URL directly
  if (invoiceSettings.externalProvider?.enabled && invoiceSettings.externalProvider?.downloadUrlTemplate) {
    const t = invoiceSettings.externalProvider.downloadUrlTemplate;
    const externalUrl = t
      .replace(/\{\{invoiceId\}\}/g, String(invoice._id))
      .replace(/\{\{invoiceNumber\}\}/g, String(invoice.invoiceNumber))
      .replace(/\{\{customerName\}\}/g, encodeURIComponent(invoice.customer?.name || ''))
      .replace(/\{\{totalAmount\}\}/g, String(invoice.totalAmount || 0));

    invoice.pdfUrl = externalUrl;
    await invoice.save();

    return res.json({ 
      success: true, 
      data: { 
        pdfUrl: externalUrl, 
        provider: invoiceSettings.externalProvider.name || 'external' 
      } 
    });
  }

  // Generate PDF using built-in generator
  try {
    console.log('Generating PDF for invoice:', invoice.invoiceNumber);
    console.log('Invoice data for PDF:', {
      invoiceNumber: invoiceData.invoiceNumber,
      customerName: invoiceData.customerName,
      totalAmount: invoiceData.totalAmount,
      hasCompanyInfo: !!invoiceData.companyInfo,
      hasBankDetails: !!invoiceData.bankDetails
    });
    
    const pdf = await generateInvoicePDF(invoiceData, 'invoice');
    console.log('PDF generated successfully:', pdf);

    // If S3 configured, upload and use S3 URL
    if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('Uploading to S3...');
      const s3Key = `invoices/${pdf.filename}`;
      const uploaded = await uploadFilePathToS3(pdf.filepath, s3Key, 'application/pdf');
      invoice.pdfUrl = uploaded.url;
      console.log('Uploaded invoice PDF to S3:', uploaded.url);
      // Best-effort cleanup of local file
      try {
        if (pdf.filepath && fs.existsSync(pdf.filepath)) {
          fs.unlinkSync(pdf.filepath);
          console.log('Deleted local invoice PDF:', pdf.filepath);
        }
      } catch (cleanupErr) {
        console.warn('Failed to delete local invoice PDF:', cleanupErr?.message);
      }
    } else {
      console.log('S3 not configured, using local URL');
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      invoice.pdfUrl = `${backendUrl}/uploads/invoices/${pdf.filename}`;
    }
    
    console.log('Saving invoice with PDF URL:', invoice.pdfUrl);
    await invoice.save();

    console.log('PDF URL set:', invoice.pdfUrl);

    return res.json({ 
      success: true, 
      data: { 
        pdfUrl: invoice.pdfUrl,
        filename: pdf.filename
      } 
    });
  } catch (error) {
    console.error('PDF generation error details:', {
      message: error.message,
      stack: error.stack,
      invoiceId: req.params.id,
      invoiceNumber: invoice?.invoiceNumber
    });
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate PDF', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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

// @desc    Get all payments with filters and pagination
// @route   GET /api/payments
// @access  Private
export const getPayments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    paymentMethod,
    invoiceId,
    customerId,
    startDate,
    endDate
  } = req.query;

  const query = {};

  if (status) query.status = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (invoiceId) query.invoice = invoiceId;
  if (customerId) query.customer = customerId;

  // Date range filter on paymentDate
  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.paymentDate.$lte = end;
    }
  }

  // Text search on notes or transactionId (case-insensitive)
  if (search) {
    query.$or = [
      { notes: { $regex: search, $options: 'i' } },
      { transactionId: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10) || 10, 100);

  // Query paginated results
  const [payments, totalCount, totals] = await Promise.all([
    Payment.find(query)
      .populate({
        path: 'invoice',
        select: 'invoiceNumber customer',
        populate: { path: 'customer', select: 'name contactNumber' }
      })
      .populate('customer', 'name contactNumber')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum),
    Payment.countDocuments(query),
    // Aggregate totals for filtered set
    Payment.aggregate([
      { $match: normalizeMatch(query) },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  const totalPages = Math.ceil(totalCount / limitNum) || 1;
  const summary = totals && totals[0] ? { totalAmount: totals[0].totalAmount, count: totals[0].count } : { totalAmount: 0, count: 0 };

  res.json({
    success: true,
    data: payments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages
    },
    summary
  });
});

// Helper to convert Mongoose query with RegExp/Date into plain values for aggregation match
function normalizeMatch(q) {
  const out = {};
  for (const [k, v] of Object.entries(q)) {
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      out[k] = normalizeMatch(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: 'invoice',
      select: 'invoiceNumber customer',
      populate: { path: 'customer', select: 'name contactNumber' }
    })
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
  const { invoiceId, amount, paymentMethod, transactionId, referenceNumber, notes, chequeNumber, bankName, chequeDate } = req.body;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  // Record payment
  const paymentData = {
    invoice: invoiceId,
    customer: invoice.customer,
    amount,
    paymentMethod,
    transactionId: transactionId || referenceNumber || undefined,
    referenceNumber: referenceNumber || transactionId || undefined,
    notes,
    status: 'success',
    recordedBy: req.user._id
  };
  if (paymentMethod === 'cheque') {
    paymentData.chequeDetails = {
      chequeNumber: chequeNumber || referenceNumber || '',
      bankName: bankName || '',
      chequeDate: chequeDate ? new Date(chequeDate) : undefined,
      clearanceStatus: 'pending'
    };
  }

  const payment = await Payment.create(paymentData);

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