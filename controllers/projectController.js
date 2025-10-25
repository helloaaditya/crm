import Project from '../models/Project.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadToS3, uploadMultipleToS3 } from '../utils/s3Service.js';
import { generateInvoicePDF, generateWarrantyCertificate } from '../utils/pdfService.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  const { search, status, category, page = 1, limit = 10 } = req.query;

  let query = {};

  if (search) {
    query.$or = [
      { projectId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (status) query.status = status;
  if (category) query.category = category;

  const projects = await Project.find(query)
    .populate('customer', 'name contactNumber email')
    .populate('supervisors.employee', 'name employeeId')
    .populate('workers.employee', 'name employeeId')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Project.countDocuments(query);

  res.json({
    success: true,
    data: projects,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count
  });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('customer')
    .populate('supervisors.employee', 'name employeeId')
    .populate('workers.employee', 'name employeeId')
    .populate('materialRequirements.material')
    .populate('siteVisits.assignedPerson', 'name')
    .populate('createdBy', 'name');

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  res.json({
    success: true,
    data: project
  });
});

// @desc    Create project
// @route   POST /api/projects
// @access  Private
export const createProject = asyncHandler(async (req, res) => {
  const {
    customer,
    projectType,
    category,
    subCategory,
    description,
    siteAddress,
    startDate,
    expectedEndDate,
    supervisors,
    workers,
    estimatedCost
  } = req.body;

  const project = await Project.create({
    customer,
    projectType,
    category,
    subCategory,
    description,
    siteAddress,
    startDate,
    expectedEndDate,
    supervisors,
    workers,
    estimatedCost,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: project
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  project = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: project
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Remove this project from all assigned employees
  await Employee.updateMany(
    { 'assignedProjects.project': project._id },
    { $pull: { assignedProjects: { project: project._id } } }
  );

  // Also remove from managed projects for supervisors
  await Employee.updateMany(
    { managedProjects: project._id },
    { $pull: { managedProjects: project._id } }
  );

  await project.deleteOne();

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
});

// @desc    Add site visit
// @route   POST /api/projects/:id/site-visit
// @access  Private
export const addSiteVisit = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { assignedPerson, visitDate, findings, images } = req.body;

  project.siteVisits.push({
    assignedPerson,
    visitDate,
    findings,
    images
  });

  await project.save();

  res.json({
    success: true,
    data: project
  });
});

// @desc    Upload project images
// @route   POST /api/projects/:id/images
// @access  Private
export const uploadProjectImages = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Please upload images' });
  }

  // Upload to S3 or save locally
  const uploadedImages = req.files.map(file => ({
    url: `/uploads/projects/${file.filename}`,
    description: req.body.description || '',
    uploadedBy: req.user._id
  }));

  project.images.push(...uploadedImages);
  await project.save();

  res.json({
    success: true,
    data: project
  });
});

// @desc    Add material requirement
// @route   POST /api/projects/:id/materials
// @access  Private
export const addMaterialRequirement = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { material, quantity, unit } = req.body;

  project.materialRequirements.push({
    material,
    quantity,
    unit,
    status: 'pending'
  });

  await project.save();

  res.json({
    success: true,
    data: project
  });
});

// @desc    Add returned material
// @route   POST /api/projects/:id/return-materials
// @access  Private
export const addReturnedMaterial = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { material, quantity, reason, images } = req.body;

  project.returnedMaterials.push({
    material,
    quantity,
    reason,
    images,
    returnedBy: req.user._id
  });

  await project.save();

  res.json({
    success: true,
    data: project
  });
});

// @desc    Generate quotation
// @route   GET /api/projects/:id/quotation
// @access  Private
export const generateQuotation = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('customer');

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Prepare quotation data
  const quotationData = {
    invoiceNumber: `QUO-${project.projectId}`,
    customerName: project.customer.name,
    customerPhone: project.customer.contactNumber,
    customerAddress: project.siteAddress,
    invoiceDate: new Date(),
    items: [
      {
        description: `${project.category} - ${project.subCategory}`,
        quantity: 1,
        unit: 'Project',
        rate: project.estimatedCost,
        amount: project.estimatedCost
      }
    ],
    subtotal: project.estimatedCost,
    totalAmount: project.estimatedCost,
    isGST: true,
    cgst: project.estimatedCost * 0.09,
    sgst: project.estimatedCost * 0.09
  };

  const pdf = await generateInvoicePDF(quotationData, 'quotation');

  res.json({
    success: true,
    data: {
      pdfUrl: `/uploads/invoices/${pdf.filename}`
    }
  });
});

// @desc    Generate warranty certificate
// @route   GET /api/projects/:id/warranty
// @access  Private
export const generateWarranty = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('customer');

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (project.status !== 'completed') {
    return res.status(400).json({ message: 'Project must be completed to generate warranty' });
  }

  const warrantyData = {
    projectId: project.projectId,
    customerName: project.customer.name,
    projectType: `${project.category} - ${project.subCategory}`,
    completionDate: project.actualEndDate || new Date(),
    warrantyPeriod: project.warrantyPeriod,
    warrantyExpiry: new Date(Date.now() + project.warrantyPeriod * 30 * 24 * 60 * 60 * 1000)
  };

  const certificate = await generateWarrantyCertificate(warrantyData);

  project.warrantyCertificateUrl = `/uploads/certificates/${certificate.filename}`;
  project.warrantyExpiryDate = warrantyData.warrantyExpiry;
  await project.save();

  res.json({
    success: true,
    data: {
      certificateUrl: project.warrantyCertificateUrl
    }
  });
});

// @desc    Assign employee to project
// @route   POST /api/projects/:id/assign-employee
// @access  Private
export const assignEmployee = asyncHandler(async (req, res) => {
  const { employeeId, role } = req.body; // role: 'supervisor' or 'worker'

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  project.assignEmployee(employeeId, role, req.user._id);
  await project.save();

  const populated = await Project.findById(project._id)
    .populate('supervisors.employee', 'name employeeId')
    .populate('workers.employee', 'name employeeId');

  res.json({
    success: true,
    data: populated,
    message: `Employee assigned as ${role} successfully`
  });
});

// @desc    Remove employee from project
// @route   DELETE /api/projects/:id/remove-employee/:employeeId
// @access  Private
export const removeEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  
  // Remove employee from project's supervisors or workers
  const supervisorIndex = project.supervisors.findIndex(s => s.employee.toString() === employeeId);
  const workerIndex = project.workers.findIndex(w => w.employee.toString() === employeeId);
  
  let removedRole = '';
  
  if (supervisorIndex !== -1) {
    removedRole = project.supervisors[supervisorIndex].role || 'supervisor';
    project.supervisors.splice(supervisorIndex, 1);
  } else if (workerIndex !== -1) {
    removedRole = project.workers[workerIndex].role || 'worker';
    project.workers.splice(workerIndex, 1);
  } else {
    return res.status(404).json({ message: 'Employee not assigned to this project' });
  }
  
  // Save project changes
  await project.save();
  
  // Also remove project from employee's assignedProjects
  await Employee.updateOne(
    { _id: employeeId },
    { $pull: { assignedProjects: { project: project._id } } }
  );
  
  // Log activity
  project.activityHistory.push({
    action: 'employee_removed',
    description: `Removed employee from project as ${removedRole}`,
    performedBy: req.user._id,
    details: { employeeId, role: removedRole },
    date: new Date()
  });
  
  await project.save();
  
  res.json({
    success: true,
    message: 'Employee removed from project successfully'
  });
});

// @desc    Add work update
// @route   POST /api/projects/:id/work-update
// @access  Private
export const addWorkUpdate = asyncHandler(async (req, res) => {
  const { title, description, status, images, audioNotes, videoRecordings, documents } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  project.addWorkUpdate({
    title,
    description,
    status,
    images: images || [],
    audioNotes: audioNotes || [],
    videoRecordings: videoRecordings || [],
    documents: documents || [],
    updatedBy: req.user._id
  });

  await project.save();

  res.json({
    success: true,
    data: project,
    message: 'Work update added successfully'
  });
});

// @desc    Upload project files (images, audio, video, documents)
// @route   POST /api/projects/:id/upload-files
// @access  Private
export const uploadProjectFiles = asyncHandler(async (req, res) => {
  const { type, category, description } = req.body; // type: 'image', 'video', 'audio', 'document'

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Please upload files' });
  }

  // Upload files
  const uploadedFiles = req.files.map(file => ({
    name: file.originalname,
    url: `/uploads/projects/${file.filename}`,
    type: type || 'other',
    size: file.size,
    description: description || '',
    category: category || 'other',
    uploadedBy: req.user._id
  }));

  project.documents.push(...uploadedFiles);

  // Log activity
  project.activityHistory.push({
    action: 'file_uploaded',
    description: `Uploaded ${uploadedFiles.length} file(s) - ${type}`,
    performedBy: req.user._id,
    files: uploadedFiles.map(f => f.url),
    date: new Date()
  });

  await project.save();

  res.json({
    success: true,
    data: project,
    message: 'Files uploaded successfully'
  });
});

// @desc    Get project activity history
// @route   GET /api/projects/:id/history
// @access  Private
export const getProjectHistory = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('activityHistory.performedBy', 'name email')
    .populate('workUpdates.updatedBy', 'name employeeId')
    .populate('workUpdates.approvedBy', 'name')
    .populate('comments.createdBy', 'name')
    .select('projectId activityHistory workUpdates comments');

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Sort activity history by date descending
  const sortedHistory = project.activityHistory.sort((a, b) => b.date - a.date);

  res.json({
    success: true,
    data: {
      projectId: project.projectId,
      activityHistory: sortedHistory,
      workUpdates: project.workUpdates.sort((a, b) => b.date - a.date),
      comments: project.comments.sort((a, b) => b.createdAt - a.createdAt)
    }
  });
});

// @desc    Add comment to project
// @route   POST /api/projects/:id/comment
// @access  Private
export const addComment = asyncHandler(async (req, res) => {
  const { text, attachments } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  project.comments.push({
    text,
    attachments: attachments || [],
    createdBy: req.user._id
  });

  // Log activity
  project.activityHistory.push({
    action: 'comment_added',
    description: text.substring(0, 100),
    performedBy: req.user._id,
    date: new Date()
  });

  await project.save();

  const populated = await Project.findById(project._id)
    .populate('comments.createdBy', 'name');

  res.json({
    success: true,
    data: populated,
    message: 'Comment added successfully'
  });
});

// @desc    Update project status
// @route   PUT /api/projects/:id/status
// @access  Private
export const updateProjectStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const oldStatus = project.status;
  project.status = status;

  // Set actual end date if completed
  if (status === 'completed' && !project.actualEndDate) {
    project.actualEndDate = new Date();
  }

  // Log activity
  project.activityHistory.push({
    action: 'status_changed',
    description: `Status changed from ${oldStatus} to ${status}`,
    performedBy: req.user._id,
    oldValue: oldStatus,
    newValue: status,
    date: new Date()
  });

  await project.save();

  res.json({
    success: true,
    data: project,
    message: 'Project status updated successfully'
  });
});

// @desc    Mark project as complete by employee
// @route   PUT /api/projects/:id/mark-complete
// @access  Private
export const markProjectComplete = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user is assigned to this project
  const isAssigned = project.supervisors.some(sup => sup.employee.toString() === req.user._id.toString()) ||
                    project.workers.some(worker => worker.employee.toString() === req.user._id.toString());
  
  if (!isAssigned) {
    return res.status(403).json({ message: 'You are not assigned to this project' });
  }

  // Mark project as complete
  project.markAsComplete(req.user._id);
  await project.save();

  res.json({
    success: true,
    data: project,
    message: 'Project marked as completed successfully'
  });
});
