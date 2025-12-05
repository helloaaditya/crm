import Project from '../models/Project.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadToS3, uploadMultipleToS3, getSignedUrl } from '../utils/s3Service.js';
import { generateInvoicePDF, generateWarrantyCertificate } from '../utils/pdfService.js';
import { createNotification, NotificationTemplates, sendToMultipleUsers } from './notificationController.js';

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

  if (status) {
    // Support comma-separated status values (e.g., "planning,in_progress")
    if (status.includes(',')) {
      query.status = { $in: status.split(',').map(s => s.trim()) };
    } else {
      query.status = status;
    }
  }
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
  console.log('📥 Received project data:', JSON.stringify(req.body, null, 2));

  const {
    name,
    customer,
    projectType,
    category,
    subCategory,
    description,
    siteAddress,
    billingAddress,
    startDate,
    expectedEndDate,
    supervisors,
    workers,
    estimatedCost,
    materialRequirements,
    itemsToBeUsed,
    brand,
    thickness,
    units,
    clientGstNumber,
    projectDate
  } = req.body;

  console.log('📦 Material Requirements:', materialRequirements);
  console.log('📝 Item Details:', { itemsToBeUsed, brand, thickness, units });

  const project = await Project.create({
    name,
    customer,
    projectType,
    category,
    subCategory,
    description,
    siteAddress,
    billingAddress,
    startDate,
    expectedEndDate,
    supervisors,
    workers,
    estimatedCost,
    materialRequirements,
    itemsToBeUsed,
    brand,
    thickness,
    units,
    clientGstNumber,
    projectDate,
    createdBy: req.user._id
  });

  console.log('✅ Project created:', project.projectId);
  console.log('📦 Saved material requirements:', project.materialRequirements);

  // Notify assigned employees
  const assignedEmployees = [
    ...(supervisors || []).map(s => s.employee),
    ...(workers || []).map(w => w.employee)
  ].filter(Boolean);

  if (assignedEmployees.length > 0) {
    await sendToMultipleUsers(
      assignedEmployees,
      NotificationTemplates.projectAssigned(
        project.name ? `${project.projectId} - ${project.name}` : `${project.projectId} - ${project.description}`,
        project._id,
        req.user._id
      )
    );
  }

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

  const oldProject = project;
  project = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  // Notify assigned employees about project update
  const assignedEmployees = [
    ...(project.supervisors || []).map(s => s.employee),
    ...(project.workers || []).map(w => w.employee)
  ].filter(Boolean);

  if (assignedEmployees.length > 0) {
    await sendToMultipleUsers(
      assignedEmployees,
      NotificationTemplates.projectUpdated(
        `${project.projectId} - ${project.description}`,
        project._id,
        req.user._id
      )
    );
  }

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
  // Accept all valid employee roles
  const validRoles = ['supervisor', 'worker', 'engineer', 'helper', 'technician', 'manager', 'admin', 'driver'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
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
    
    // Save project with validation disabled to avoid issues with optional fields
    try {
      await project.save({ validateBeforeSave: true });
      console.log('Project updated with employee assignment');
    } catch (saveError) {
      console.error('Error saving project:', saveError);
      // If validation error, try to get more details
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.keys(saveError.errors || {}).map(key => ({
          field: key,
          message: saveError.errors[key].message
        }));
        console.error('Validation errors:', validationErrors);
        return res.status(400).json({
          success: false,
          message: 'Project validation failed',
          errors: validationErrors
        });
      }
      throw saveError;
    }

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
      
      try {
        await employee.save({ validateBeforeSave: true });
        console.log('Employee saved with assigned project');
      } catch (saveError) {
        console.error('Error saving employee:', saveError);
        if (saveError.name === 'ValidationError') {
          const validationErrors = Object.keys(saveError.errors || {}).map(key => ({
            field: key,
            message: saveError.errors[key].message
          }));
          console.error('Employee validation errors:', validationErrors);
          return res.status(400).json({
            success: false,
            message: 'Employee validation failed',
            errors: validationErrors
          });
        }
        throw saveError;
      }
      
      // Send notification to assigned employee
      if (employee.userId) {
        try {
          await createNotification({
            recipient: employee.userId,
            ...NotificationTemplates.projectAssigned(
              project.name || project.description || project.projectId,
              project._id,
              req.user._id
            )
          });
        } catch (notifError) {
          console.error('Error creating notification (non-fatal):', notifError);
          // Don't fail the assignment if notification fails
        }
      }
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      errors: error.errors
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign employee to project',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        errors: error.errors
      } : undefined
    });
  }
});

// @desc    Remove employee from project
// @route   POST /api/projects/:id/remove-employee
// @access  Private
export const removeEmployee = asyncHandler(async (req, res) => {
  const employeeId = req.params.employeeId; // Get from URL parameter

  console.log('Removing employee from project:', { projectId: req.params.id, employeeId });

  const project = await Project.findById(req.params.id);
  if (!project) {
    console.log('Project not found:', req.params.id);
    return res.status(404).json({ message: 'Project not found' });
  }

  // Remove from project
  project.removeEmployee(employeeId, req.user._id);
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

  // Notify project admin/creator about work update
  const { createNotification } = await import('./notificationController.js');
  if (project.createdBy && project.createdBy.toString() !== req.user._id.toString()) {
    await createNotification({
      recipient: project.createdBy,
      type: 'work_update_added',
      title: 'New Work Update',
      message: `${req.user.name} added a work update: "${title}" on project ${project.description || project.projectId}`,
      actionUrl: `/projects/${project._id}`,
      priority: 'normal',
      triggeredBy: req.user._id
    });
  }

  // Also notify other assigned employees (except the updater)
  const assignedEmployeeIds = [
    ...(project.supervisors || []).map(s => s.employee),
    ...(project.workers || []).map(w => w.employee)
  ].filter(Boolean);
  
  if (assignedEmployeeIds.length > 0) {
    const Employee = (await import('../models/Employee.js')).default;
    const { sendToMultipleUsers } = await import('./notificationController.js');
    
    // Get userIds of assigned employees (except the one who posted the update)
    const employees = await Employee.find({
      _id: { $in: assignedEmployeeIds }
    }).select('userId');
    
    const userIds = employees
      .map(emp => emp.userId)
      .filter(userId => userId && userId.toString() !== req.user._id.toString());
    
    if (userIds.length > 0) {
      await sendToMultipleUsers(userIds, {
        type: 'work_update_added',
        title: 'Work Update on Your Project',
        message: `${req.user.name} posted: "${title}" on ${project.description || project.projectId}`,
        actionUrl: `/projects/${project._id}`,
        priority: 'normal',
        triggeredBy: req.user._id
      });
    }
  }

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

// @desc    Delete media from project history
// @route   DELETE /api/projects/:id/history/media
// @access  Private
export const deleteProjectMedia = asyncHandler(async (req, res) => {
  const { itemId, itemType, mediaUrl, mediaType } = req.body;
  
  if (!itemId || !itemType || !mediaUrl || !mediaType) {
    return res.status(400).json({ 
      message: 'Missing required fields: itemId, itemType, mediaUrl, mediaType' 
    });
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  let updated = false;

  if (itemType === 'activity') {
    const activity = project.activityHistory.id(itemId);
    if (activity) {
      // Remove media URL from the appropriate array
      if (mediaType === 'images' && activity.images) {
        activity.images = activity.images.filter(url => url !== mediaUrl);
        updated = true;
      } else if (mediaType === 'audioNotes' && activity.audioNotes) {
        activity.audioNotes = activity.audioNotes.filter(url => url !== mediaUrl);
        updated = true;
      } else if (mediaType === 'videoRecordings' && activity.videoRecordings) {
        activity.videoRecordings = activity.videoRecordings.filter(url => url !== mediaUrl);
        updated = true;
      } else if (mediaType === 'documents' && activity.documents) {
        activity.documents = activity.documents.filter(url => url !== mediaUrl);
        updated = true;
      }
    }
  } else if (itemType === 'workUpdate') {
    const workUpdate = project.workUpdates.id(itemId);
    if (workUpdate) {
      // Remove media URL from the appropriate array
      if (mediaType === 'images' && workUpdate.images) {
        workUpdate.images = workUpdate.images.filter(url => url !== mediaUrl);
        updated = true;
      } else if (mediaType === 'audioNotes' && workUpdate.audioNotes) {
        workUpdate.audioNotes = workUpdate.audioNotes.filter(url => url !== mediaUrl);
        updated = true;
      } else if (mediaType === 'videoRecordings' && workUpdate.videoRecordings) {
        workUpdate.videoRecordings = workUpdate.videoRecordings.filter(url => url !== mediaUrl);
        updated = true;
      } else if (mediaType === 'documents' && workUpdate.documents) {
        workUpdate.documents = workUpdate.documents.filter(url => url !== mediaUrl);
        updated = true;
      }
    }
  }

  if (!updated) {
    return res.status(404).json({ message: 'Media not found or already deleted' });
  }

  await project.save();

  res.json({
    success: true,
    message: 'Media deleted successfully'
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

  // Notify assigned employees about status change
  const assignedEmployeeIds = [
    ...(project.supervisors || []).map(s => s.employee),
    ...(project.workers || []).map(w => w.employee)
  ].filter(Boolean);
  
  if (assignedEmployeeIds.length > 0) {
    const Employee = (await import('../models/Employee.js')).default;
    const { sendToMultipleUsers } = await import('./notificationController.js');
    
    // Get userIds of assigned employees
    const employees = await Employee.find({
      _id: { $in: assignedEmployeeIds }
    }).select('userId');
    
    const userIds = employees.map(emp => emp.userId).filter(Boolean);
    
    if (userIds.length > 0) {
      await sendToMultipleUsers(userIds, {
        type: 'project_status_changed',
        title: 'Project Status Updated',
        message: `Project "${project.description || project.projectId}" status changed from ${oldStatus} to ${status}`,
        actionUrl: `/projects/${project._id}`,
        priority: status === 'completed' ? 'high' : 'normal',
        triggeredBy: req.user._id
      });
    }
  }

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
  const Employee = (await import('../models/Employee.js')).default;
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    return res.status(403).json({ message: 'Employee record not found' });
  }

  // Check if employee is in supervisors or workers arrays
  const isSupervisor = project.supervisors && 
                       project.supervisors.some(sup => sup.employee.toString() === employee._id.toString());
  const isWorker = project.workers && 
                   project.workers.some(worker => worker.employee.toString() === employee._id.toString());
  
  if (!isSupervisor && !isWorker) {
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

// @desc    Project stock out (send material to project)
// @route   POST /api/projects/:id/stock-out
// @access  Private
export const projectStockOut = asyncHandler(async (req, res) => {
  const { materialId, quantity, date, notes } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const Material = (await import('../models/Material.js')).default;
  const material = await Material.findById(materialId);
  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  if (material.quantity < Number(quantity)) {
    return res.status(400).json({ message: 'Insufficient stock' });
  }

  // Deduct from inventory
  material.quantity -= Number(quantity);

  // Add to stock history
  material.stockHistory.push({
    type: 'outward',
    quantity: Number(quantity),
    balanceAfter: material.quantity,
    location: 'project_site',
    reference: `Stock Out to ${project.projectId}`,
    project: project._id,
    notes: notes || `Sent to project: ${project.name}`,
    date: date || new Date(),
    handledBy: req.user._id
  });

  await material.save();

  res.json({
    success: true,
    message: 'Stock sent to project successfully',
    data: { material, project }
  });
});

// @desc    Project stock in (return material from project)
// @route   POST /api/projects/:id/stock-in
// @access  Private
export const projectStockIn = asyncHandler(async (req, res) => {
  const { materialId, quantity, date, notes } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const Material = (await import('../models/Material.js')).default;
  const material = await Material.findById(materialId);
  if (!material) {
    return res.status(404).json({ message: 'Material not found' });
  }

  // Add back to inventory
  material.quantity += Number(quantity);

  // Add to stock history
  material.stockHistory.push({
    type: 'return',
    quantity: Number(quantity),
    balanceAfter: material.quantity,
    location: material.storageLocation || 'godown',
    reference: `Stock Return from ${project.projectId}`,
    project: project._id,
    notes: notes || `Returned from project: ${project.name}`,
    date: date || new Date(),
    handledBy: req.user._id
  });

  await material.save();

  res.json({
    success: true,
    message: 'Stock returned from project successfully',
    data: { material, project }
  });
});

// @desc    Get project stock history
// @route   GET /api/projects/:id/stock-history
// @access  Private
export const getProjectStockHistory = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const Material = (await import('../models/Material.js')).default;
  
  console.log('📊 Fetching stock history for project:', project.projectId);
  
  // Get all materials with stock history for this project
  const materials = await Material.find({
    'stockHistory.project': project._id
  }).select('name materialId unit quantity stockHistory');

  console.log('📦 Found materials with history:', materials.length);

  // Extract and format stock history
  const stockHistory = [];
  materials.forEach(material => {
    material.stockHistory.forEach(history => {
      if (history.project && history.project.toString() === project._id.toString()) {
        stockHistory.push({
          type: history.type,
          quantity: history.quantity,
          balanceAfter: history.balanceAfter,
          date: history.date,
          notes: history.notes,
          reference: history.reference,
          material: {
            _id: material._id,
            name: material.name,
            materialId: material.materialId,
            unit: material.unit,
            currentStock: material.quantity // Add current stock for reference
          }
        });
      }
    });
  });

  // Sort by date (newest first)
  stockHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log('📋 Returning stock history entries:', stockHistory.length);

  res.json({
    success: true,
    data: stockHistory
  });
});
