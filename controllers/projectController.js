import Project from '../models/Project.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadToS3, uploadMultipleToS3, getSignedUrl } from '../utils/s3Service.js';
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

  // Upload to S3 (memory buffers)
  try {
    const { uploadMultipleFromMemory } = await import('../utils/s3Service.js');
    const uploaded = await uploadMultipleFromMemory(req.files, 'projects');

    const uploadedImages = uploaded.map((file, index) => ({
      url: file.url,
      description: req.body.description || '',
      uploadedBy: req.user._id
    }));

    project.images.push(...uploadedImages);
    await project.save();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('S3 upload error (project images):', error);
    res.status(500).json({ success: false, message: 'Failed to upload images to S3', error: error.message });
  }
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
  const { employeeId, role } = req.body;

  // Validation
  if (!employeeId) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }
  if (!role) {
    return res.status(400).json({ message: 'Role is required' });
  }
  if (!['supervisor', 'worker', 'engineer', 'helper', 'technician'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be supervisor, worker, engineer, helper, or technician' });
  }

  console.log('Assigning employee to project:', { projectId: req.params.id, employeeId, role });

  const project = await Project.findById(req.params.id);
  if (!project) {
    console.log('Project not found:', req.params.id);
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if employee exists
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    console.log('Employee not found:', employeeId);
    return res.status(404).json({ message: 'Employee not found' });
  }

  // Check if employee is already assigned
  const isAlreadyAssigned = project.supervisors.some(s => s.employee.toString() === employeeId) ||
                          project.workers.some(w => w.employee.toString() === employeeId);
  
  if (isAlreadyAssigned) {
    console.log('Employee already assigned to project:', { projectId: project._id, employeeId });
    return res.status(400).json({ message: 'Employee already assigned to this project' });
  }

  try {
    // Assign employee to project
    project.assignEmployee(employeeId, role, req.user._id);
    await project.save();
    console.log('Project updated with employee assignment');

    // Also update employee's assignedProjects array
    const projectAlreadyAssigned = employee.assignedProjects.some(ap => 
      ap.project.toString() === project._id.toString() && ap.status === 'active'
    );
    
    if (!projectAlreadyAssigned) {
      const assignment = {
        project: project._id,
        role: role,
        assignedBy: req.user._id,
        status: 'active'
      };
      
      employee.assignedProjects.push(assignment);
      console.log('Added project to employee assignedProjects:', assignment);
      
      // If supervisor, also add to managedProjects
      if (role === 'supervisor') {
        if (!employee.managedProjects.includes(project._id)) {
          employee.managedProjects.push(project._id);
          console.log('Added project to employee managedProjects:', project._id);
        }
      }
      
      await employee.save();
      console.log('Employee saved with assigned project');
    } else {
      console.log('Project already assigned to employee in assignedProjects array');
    }

    const populated = await Project.findById(project._id)
      .populate('supervisors.employee', 'name employeeId')
      .populate('workers.employee', 'name employeeId');

    res.json({
      success: true,
      data: populated,
      message: `Employee assigned as ${role} successfully`
    });
  } catch (error) {
    console.error('Error assigning employee to project:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign employee to project',
      error: error.message 
    });
  }
});

// @desc    Remove employee from project
// @route   POST /api/projects/:id/remove-employee
// @access  Private
export const removeEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;

  console.log('Removing employee from project:', { projectId: req.params.id, employeeId });

  const project = await Project.findById(req.params.id);
  if (!project) {
    console.log('Project not found:', req.params.id);
    return res.status(404).json({ message: 'Project not found' });
  }

  // Remove from project
  project.removeEmployee(employeeId);
  await project.save();
  console.log('Employee removed from project');

  // Also update employee's assignedProjects status
  const employee = await Employee.findById(employeeId);
  if (employee) {
    console.log('Employee found for removal:', employee._id);
    const projectAssignment = employee.assignedProjects.find(
      ap => ap.project.toString() === project._id.toString() && ap.status === 'active'
    );
    
    if (projectAssignment) {
      projectAssignment.status = 'removed';
      projectAssignment.completionDate = new Date();
      console.log('Updated employee project assignment status to removed');
      
      // If this was a managed project, remove it
      employee.managedProjects = employee.managedProjects.filter(
        mp => mp.toString() !== project._id.toString()
      );
      console.log('Removed project from managedProjects if it was there');
      
      await employee.save();
      console.log('Employee saved after project removal');
    } else {
      console.log('Project assignment not found in employee record');
    }
  } else {
    console.log('Employee not found for removal:', employeeId);
  }

  const populated = await Project.findById(project._id)
    .populate('supervisors.employee', 'name employeeId')
    .populate('workers.employee', 'name employeeId');

  res.json({
    success: true,
    data: populated,
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

  // If files are uploaded, upload them to S3
  let uploadedImages = images || [];
  let uploadedAudioNotes = audioNotes || [];
  let uploadedVideoRecordings = videoRecordings || [];
  let uploadedDocuments = documents || [];

  if (req.files && req.files.length > 0) {
    try {
      const { uploadMultipleToS3 } = await import('../utils/s3Service.js');
      const uploadedFiles = await uploadMultipleToS3(req.files, 'work-updates');

      // Categorize uploaded files based on their type
      uploadedFiles.forEach((file, index) => {
        const originalFile = req.files[index];
        const fileUrl = file.url;
        
        if (originalFile.mimetype.startsWith('image/')) {
          uploadedImages.push(fileUrl);
        } else if (originalFile.mimetype.startsWith('audio/')) {
          uploadedAudioNotes.push(fileUrl);
        } else if (originalFile.mimetype.startsWith('video/')) {
          uploadedVideoRecordings.push(fileUrl);
        } else {
          uploadedDocuments.push(fileUrl);
        }
      });
    } catch (error) {
      console.error('S3 upload error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload files to S3',
        error: error.message 
      });
    }
  }

  project.addWorkUpdate({
    title,
    description,
    status,
    images: uploadedImages,
    audioNotes: uploadedAudioNotes,
    videoRecordings: uploadedVideoRecordings,
    documents: uploadedDocuments,
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

  try {
    // Upload files to S3
    const { uploadMultipleFromMemory } = await import('../utils/s3Service.js');
    const uploadedFiles = await uploadMultipleFromMemory(req.files, 'projects');

    // Create document records
    const documentRecords = uploadedFiles.map((file, index) => ({
      name: req.files[index].originalname,
      url: file.url,
      type: type || 'other',
      size: req.files[index].size,
      description: description || '',
      category: category || 'other',
      uploadedBy: req.user._id
    }));

    project.documents.push(...documentRecords);

    // Log activity
    project.activityHistory.push({
      action: 'file_uploaded',
      description: `Uploaded ${documentRecords.length} file(s) - ${type}`,
      performedBy: req.user._id,
      files: documentRecords.map(f => f.url),
      date: new Date()
    });

    await project.save();

    res.json({
      success: true,
      data: project,
      message: 'Files uploaded successfully to S3'
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload files to S3',
      error: error.message 
    });
  }
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

  // Helper to generate proxy URL or signed URL for S3 objects
  const proxyIfS3 = (url) => {
    try {
      if (!url) return url;
      if (url.includes('amazonaws.com')) {
        // Option 1: Use direct S3 URL if bucket is public (faster, no backend needed)
        return url;
        
        // Option 2: Use media proxy (requires backend with AWS credentials)
        // return `/api/media/proxy?url=${encodeURIComponent(url)}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  // Deep clone and sign media URLs
  const sortedActivity = project.activityHistory
    .sort((a, b) => b.date - a.date)
    .map(item => ({
      ...item.toObject(),
      files: Array.isArray(item.files) ? item.files.map(proxyIfS3) : item.files
    }));

  const sortedWorkUpdates = project.workUpdates
    .sort((a, b) => b.date - a.date)
    .map(wu => ({
      ...wu.toObject(),
      images: Array.isArray(wu.images) ? wu.images.map(proxyIfS3) : wu.images,
      audioNotes: Array.isArray(wu.audioNotes) ? wu.audioNotes.map(proxyIfS3) : wu.audioNotes,
      videoRecordings: Array.isArray(wu.videoRecordings) ? wu.videoRecordings.map(proxyIfS3) : wu.videoRecordings,
      documents: Array.isArray(wu.documents) ? wu.documents.map(proxyIfS3) : wu.documents,
    }));

  const sortedComments = project.comments.sort((a, b) => b.createdAt - a.createdAt);

  res.json({
    success: true,
    data: {
      projectId: project.projectId,
      activityHistory: sortedActivity,
      workUpdates: sortedWorkUpdates,
      comments: sortedComments
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
  // We need to find the employee record for this user first
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(403).json({ message: 'Employee record not found' });
  }

  const isAssigned = project.supervisors.some(sup => sup.employee.toString() === employee._id.toString()) ||
                    project.workers.some(worker => worker.employee.toString() === employee._id.toString());
  
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
