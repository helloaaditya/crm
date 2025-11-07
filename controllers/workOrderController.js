import WorkOrder from '../models/WorkOrder.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { deleteFromS3 } from '../utils/s3Service.js';

// @desc    Create work order
// @route   POST /api/work-orders
// @access  Private
export const createWorkOrder = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.create({
    ...req.body,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: workOrder
  });
});

// @desc    Get all work orders
// @route   GET /api/work-orders
// @access  Private
export const getWorkOrders = asyncHandler(async (req, res) => {
  const { status, type, customer, project, vendor } = req.query;

  const query = { isActive: true };

  if (status) query.status = status;
  if (type) query.type = type;
  if (customer) query.customer = customer;
  if (project) query.project = project;
  if (vendor) query.vendor = vendor;

  const workOrders = await WorkOrder.find(query)
    .populate('customer', 'name contactNumber')
    .populate('project', 'projectId description')
    .populate('vendor', 'vendorId name')
    .populate('assignedTo.employee', 'employeeId name designation')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: workOrders.length,
    data: workOrders
  });
});

// @desc    Get work order by ID
// @route   GET /api/work-orders/:id
// @access  Private
export const getWorkOrderById = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id)
    .populate('customer', 'name contactNumber email address')
    .populate('project', 'projectId description status')
    .populate('vendor', 'vendorId name contactPerson contactNumber')
    .populate('assignedTo.employee', 'employeeId name designation phone')
    .populate('documents.uploadedBy', 'name')
    .populate('createdBy', 'name email');

  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  res.json({
    success: true,
    data: workOrder
  });
});

// @desc    Update work order
// @route   PUT /api/work-orders/:id
// @access  Private
export const updateWorkOrder = asyncHandler(async (req, res) => {
  let workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  workOrder = await WorkOrder.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('customer project vendor assignedTo.employee createdBy');

  res.json({
    success: true,
    data: workOrder
  });
});

// @desc    Add document to work order
// @route   POST /api/work-orders/:id/documents
// @access  Private
export const addWorkOrderDocument = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  const document = {
    ...req.body,
    uploadedBy: req.user._id,
    uploadDate: new Date()
  };

  workOrder.documents.push(document);
  await workOrder.save();

  res.json({
    success: true,
    data: workOrder
  });
});

// @desc    Delete document from work order
// @route   DELETE /api/work-orders/:id/documents/:documentId
// @access  Private
export const deleteWorkOrderDocument = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  // Find the document
  const document = workOrder.documents.id(req.params.documentId);
  
  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  // Delete from S3 if URL exists
  if (document.url) {
    try {
      const urlParts = document.url.split('.com/');
      if (urlParts.length > 1) {
        const s3Key = urlParts[1];
        console.log('🗑️ Deleting work order document from S3:', s3Key);
        await deleteFromS3(s3Key);
        console.log('✅ Work order document deleted from S3');
      }
    } catch (s3Error) {
      console.error('⚠️ Error deleting work order document from S3:', s3Error.message);
    }
  }

  // Remove document from array
  document.remove();
  await workOrder.save();

  res.json({
    success: true,
    message: 'Document deleted successfully from S3 and work order',
    data: workOrder
  });
});

// @desc    Delete work order
// @route   DELETE /api/work-orders/:id
// @access  Private (Admin)
export const deleteWorkOrder = asyncHandler(async (req, res) => {
  const workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  workOrder.isActive = false;
  workOrder.status = 'cancelled';
  await workOrder.save();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Update work order status
// @route   PUT /api/work-orders/:id/status
// @access  Private
export const updateWorkOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  workOrder.status = status;
  
  if (status === 'completed') {
    workOrder.actualCompletionDate = new Date();
  }

  await workOrder.save();

  res.json({
    success: true,
    data: workOrder
  });
});

// @desc    Assign employee to work order
// @route   POST /api/work-orders/:id/assign
// @access  Private
export const assignEmployeeToWorkOrder = asyncHandler(async (req, res) => {
  const { employee, role } = req.body;

  const workOrder = await WorkOrder.findById(req.params.id);

  if (!workOrder) {
    res.status(404);
    throw new Error('Work order not found');
  }

  // Check if employee is already assigned
  const alreadyAssigned = workOrder.assignedTo.some(
    assignment => assignment.employee.toString() === employee
  );

  if (alreadyAssigned) {
    res.status(400);
    throw new Error('Employee is already assigned to this work order');
  }

  workOrder.assignedTo.push({
    employee,
    role,
    assignedDate: new Date()
  });

  await workOrder.save();

  res.json({
    success: true,
    data: workOrder
  });
});

