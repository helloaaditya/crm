import Material from '../models/Material.js';
import Vendor from '../models/Vendor.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// =============== MATERIALS ===============

// @desc    Get all materials
// @route   GET /api/inventory/materials
// @access  Private
export const getMaterials = asyncHandler(async (req, res) => {
  const { search, category, lowStock, page = 1, limit = 10 } = req.query;

  let query = { isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { materialId: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } }
    ];
  }

  if (category) query.category = category;

  const materials = await Material.find(query)
    .populate('vendor', 'name phone')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Filter low stock if requested
  let filteredMaterials = materials;
  if (lowStock === 'true') {
    filteredMaterials = materials.filter(m => m.isLowStock());
  }

  const count = await Material.countDocuments(query);

  res.json({
    success: true,
    data: filteredMaterials,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count
  });
});

// @desc    Get single material
// @route   GET /api/inventory/materials/:id
// @access  Private
export const getMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id)
    .populate('vendor')
    .populate('stockHistory.handledBy', 'name');

  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  res.json({
    success: true,
    data: material
  });
});

// @desc    Create material
// @route   POST /api/inventory/materials
// @access  Private
export const createMaterial = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    subCategory,
    brand,
    product,
    mrp,
    saleCost,
    quantity,
    unit,
    minStockLevel,
    batchCode,
    expiryDate,
    hsinNumber,
    vendor
  } = req.body;

  const material = await Material.create({
    name,
    category,
    subCategory,
    brand,
    product,
    mrp,
    saleCost,
    quantity,
    unit,
    minStockLevel,
    batchCode,
    expiryDate,
    hsinNumber,
    vendor,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: material
  });
});

// @desc    Update material
// @route   PUT /api/inventory/materials/:id
// @access  Private
export const updateMaterial = asyncHandler(async (req, res) => {
  let material = await Material.findById(req.params.id);

  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  material = await Material.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: material
  });
});

// @desc    Delete material
// @route   DELETE /api/inventory/materials/:id
// @access  Private
export const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);

  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  material.isActive = false;
  await material.save();

  res.json({
    success: true,
    message: 'Material deactivated successfully'
  });
});

// @desc    Material inward
// @route   POST /api/inventory/materials/:id/inward
// @access  Private
export const materialInward = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);

  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  const { quantity, reference, notes, projectId, invoiceId, customerId } = req.body;

  // Update quantity
  const oldQuantity = material.quantity;
  material.quantity += Number(quantity);

  // Add to stock history
  material.stockHistory.push({
    type: 'inward',
    quantity: Number(quantity),
    balanceAfter: material.quantity,
    reference,
    project: projectId || null,
    invoice: invoiceId || null,
    customer: customerId || null,
    notes,
    handledBy: req.user._id
  });

  await material.save();

  res.json({
    success: true,
    data: material,
    message: 'Material inward recorded successfully'
  });
});

// @desc    Material outward
// @route   POST /api/inventory/materials/:id/outward
// @access  Private
export const materialOutward = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);

  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  const { quantity, reference, notes, projectId, invoiceId, customerId } = req.body;

  if (material.quantity < Number(quantity)) {
    return res.status(400).json({ message: 'Insufficient stock' });
  }

  // Update quantity
  material.quantity -= Number(quantity);

  // Add to stock history
  material.stockHistory.push({
    type: 'outward',
    quantity: Number(quantity),
    balanceAfter: material.quantity,
    reference,
    project: projectId || null,
    invoice: invoiceId || null,
    customer: customerId || null,
    notes,
    handledBy: req.user._id
  });

  await material.save();

  res.json({
    success: true,
    data: material,
    message: 'Material outward recorded successfully'
  });
});

// @desc    Get low stock materials
// @route   GET /api/inventory/materials/low-stock
// @access  Private
export const getLowStockMaterials = asyncHandler(async (req, res) => {
  const materials = await Material.find({ isActive: true })
    .populate('vendor', 'name phone');

  const lowStockMaterials = materials.filter(m => m.isLowStock());

  res.json({
    success: true,
    data: lowStockMaterials,
    count: lowStockMaterials.length
  });
});

// =============== VENDORS ===============

// @desc    Get all vendors
// @route   GET /api/inventory/vendors
// @access  Private
export const getVendors = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;

  let query = { isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { vendorId: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const vendors = await Vendor.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Vendor.countDocuments(query);

  res.json({
    success: true,
    data: vendors,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count
  });
});

// @desc    Get single vendor
// @route   GET /api/inventory/vendors/:id
// @access  Private
export const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate('materialsSupplied')
    .populate('createdBy', 'name');

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  res.json({
    success: true,
    data: vendor
  });
});

// @desc    Create vendor
// @route   POST /api/inventory/vendors
// @access  Private
export const createVendor = asyncHandler(async (req, res) => {
  const {
    name,
    contactPerson,
    contactNumber,
    alternateContact,
    email,
    address,
    gstNumber,
    panNumber,
    category,
    bankDetails,
    paymentTerms,
    creditLimit,
    notes
  } = req.body;

  const vendor = await Vendor.create({
    name,
    contactPerson,
    contactNumber,
    alternateContact,
    email,
    address,
    gstNumber,
    panNumber,
    category,
    bankDetails,
    paymentTerms,
    creditLimit,
    notes
  });

  res.status(201).json({
    success: true,
    data: vendor
  });
});

// @desc    Update vendor
// @route   PUT /api/inventory/vendors/:id
// @access  Private
export const updateVendor = asyncHandler(async (req, res) => {
  let vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  vendor = await Vendor.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: vendor
  });
});

// @desc    Delete vendor
// @route   DELETE /api/inventory/vendors/:id
// @access  Private
export const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  vendor.isActive = false;
  await vendor.save();

  res.json({
    success: true,
    message: 'Vendor deactivated successfully'
  });
});

// @desc    Add vendor invoice
// @route   POST /api/inventory/vendors/:id/invoice
// @access  Private
export const addVendorInvoice = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  const { invoiceNumber, invoiceDate, amount, dueDate, invoiceUrl } = req.body;

  vendor.invoices.push({
    invoiceNumber,
    invoiceDate,
    amount,
    dueDate,
    invoiceUrl,
    status: 'pending'
  });

  vendor.outstandingBalance += amount;
  await vendor.save();

  res.json({
    success: true,
    data: vendor,
    message: 'Invoice added successfully'
  });
});

// @desc    Get stock summary
// @route   GET /api/inventory/reports/stock-summary
// @access  Private
export const getStockSummary = asyncHandler(async (req, res) => {
  const materials = await Material.find({ isActive: true });

  const summary = {
    totalMaterials: materials.length,
    totalValue: materials.reduce((sum, m) => sum + (m.quantity * m.saleCost), 0),
    lowStockCount: materials.filter(m => m.isLowStock()).length,
    byCategory: {}
  };

  // Group by category
  materials.forEach(m => {
    if (!summary.byCategory[m.category]) {
      summary.byCategory[m.category] = {
        count: 0,
        totalValue: 0
      };
    }
    summary.byCategory[m.category].count++;
    summary.byCategory[m.category].totalValue += m.quantity * m.saleCost;
  });

  res.json({
    success: true,
    data: summary
  });
});

// @desc    Return material to stock
// @route   POST /api/inventory/materials/:id/return
// @access  Private
export const returnMaterial = asyncHandler(async (req, res) => {
  const { quantity, projectId, invoiceId, notes } = req.body;

  const material = await Material.findById(req.params.id);
  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  // Add back to stock
  material.quantity += parseFloat(quantity);

  // Add stock history
  material.stockHistory.push({
    type: 'return',
    quantity: parseFloat(quantity),
    balanceAfter: material.quantity,
    reference: req.body.reference || 'Material Return',
    project: projectId || null,
    invoice: invoiceId || null,
    customer: req.body.customer || null,
    notes: notes || 'Material returned to stock',
    handledBy: req.user._id
  });

  await material.save();

  res.json({
    success: true,
    data: material,
    message: `${quantity} ${material.unit} returned to stock`
  });
});

// @desc    Get material stock history
// @route   GET /api/inventory/materials/:id/history
// @access  Private
export const getMaterialHistory = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id)
    .populate('stockHistory.project', 'projectId description')
    .populate('stockHistory.invoice', 'invoiceNumber')
    .populate('stockHistory.customer', 'name contactNumber')
    .populate('stockHistory.handledBy', 'name');

  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  // Sort history by date descending
  const history = material.stockHistory.sort((a, b) => b.date - a.date);

  res.json({
    success: true,
    data: {
      material: {
        _id: material._id,
        materialId: material.materialId,
        name: material.name,
        currentStock: material.quantity,
        unit: material.unit
      },
      history: history
    }
  });
});

// @desc    Auto restock materials when invoice is canceled
// @route   POST /api/inventory/materials/auto-restock
// @access  Private
export const autoRestockFromInvoice = asyncHandler(async (req, res) => {
  const { invoiceId, invoiceNumber, customerId, projectId, materials, handledBy } = req.body;

  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({ message: 'Materials array is required' });
  }

  const restockResults = [];
  const errors = [];

  for (const materialData of materials) {
    try {
      const { materialId, quantity, materialName } = materialData;
      
      const material = await Material.findById(materialId);
      if (!material) {
        errors.push(`Material ${materialName || materialId} not found`);
        continue;
      }

      // Add back to stock
      material.quantity += Number(quantity);

      // Add stock history entry
      material.stockHistory.push({
        type: 'return',
        quantity: Number(quantity),
        balanceAfter: material.quantity,
        reference: `Auto-restock from canceled invoice: ${invoiceNumber}`,
        project: projectId || null,
        invoice: invoiceId || null,
        customer: customerId || null,
        notes: `Automatic restock due to invoice cancellation - ${materialName}`,
        handledBy: handledBy || null
      });

      await material.save();

      restockResults.push({
        materialId: material.materialId,
        materialName: material.name,
        quantity: Number(quantity),
        newStock: material.quantity,
        unit: material.unit
      });

    } catch (error) {
      console.error(`Error restocking material ${materialData.materialId}:`, error);
      errors.push(`Failed to restock ${materialData.materialName || materialData.materialId}: ${error.message}`);
    }
  }

  res.json({
    success: true,
    data: {
      restockedMaterials: restockResults,
      errors: errors,
      totalRestocked: restockResults.length,
      totalErrors: errors.length
    },
    message: `Auto-restock completed. ${restockResults.length} materials restocked, ${errors.length} errors.`
  });
});

// @desc    Bulk material operations
// @route   POST /api/inventory/materials/bulk-operations
// @access  Private
export const bulkMaterialOperations = asyncHandler(async (req, res) => {
  const { operations, reference, notes } = req.body;

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({ message: 'Operations array is required' });
  }

  const results = [];
  const errors = [];

  for (const operation of operations) {
    try {
      const { materialId, type, quantity, projectId, invoiceId, customerId } = operation;
      
      const material = await Material.findById(materialId);
      if (!material) {
        errors.push(`Material ${materialId} not found`);
        continue;
      }

      const oldQuantity = material.quantity;
      let newQuantity = oldQuantity;

      if (type === 'inward') {
        newQuantity = oldQuantity + Number(quantity);
      } else if (type === 'outward') {
        if (oldQuantity < Number(quantity)) {
          errors.push(`Insufficient stock for ${material.name}. Available: ${oldQuantity}, Required: ${quantity}`);
          continue;
        }
        newQuantity = oldQuantity - Number(quantity);
      } else if (type === 'adjustment') {
        newQuantity = Number(quantity);
      }

      material.quantity = newQuantity;

      // Add to stock history
      material.stockHistory.push({
        type: type,
        quantity: type === 'adjustment' ? (newQuantity - oldQuantity) : Number(quantity),
        balanceAfter: newQuantity,
        reference: reference || 'Bulk Operation',
        project: projectId || null,
        invoice: invoiceId || null,
        customer: customerId || null,
        notes: notes || `Bulk ${type} operation`,
        handledBy: req.user._id
      });

      await material.save();

      results.push({
        materialId: material.materialId,
        materialName: material.name,
        operation: type,
        quantity: Number(quantity),
        oldStock: oldQuantity,
        newStock: newQuantity,
        unit: material.unit
      });

    } catch (error) {
      console.error(`Error in bulk operation for material ${operation.materialId}:`, error);
      errors.push(`Failed to process ${operation.materialId}: ${error.message}`);
    }
  }

  res.json({
    success: true,
    data: {
      operations: results,
      errors: errors,
      totalProcessed: results.length,
      totalErrors: errors.length
    },
    message: `Bulk operations completed. ${results.length} operations successful, ${errors.length} errors.`
  });
});
