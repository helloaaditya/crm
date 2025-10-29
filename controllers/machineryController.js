import Machinery from '../models/Machinery.js'
import Project from '../models/Project.js'
import { uploadToS3 } from '../utils/s3Service.js'

// Get all machinery with filtering and pagination
export const getAllMachinery = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      condition = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Build filter object
    const filter = { isActive: true }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (category) filter.category = category
    if (condition) filter.condition = condition
    
    // Status filter (available, assigned, low_stock)
    if (status === 'available') {
      filter.availableQuantity = { $gt: 0 }
    } else if (status === 'assigned') {
      filter.availableQuantity = 0
    } else if (status === 'low_stock') {
      filter.availableQuantity = { $lte: 2 }
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [machinery, total] = await Promise.all([
      Machinery.find(filter)
        .populate('assignedProjects.project', 'projectId customer description')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Machinery.countDocuments(filter)
    ])

    // Calculate summary statistics
    const stats = await Machinery.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalMachinery: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalAvailable: { $sum: '$availableQuantity' },
          totalAssigned: { $sum: { $subtract: ['$quantity', '$availableQuantity'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$availableQuantity', 2] }, 1, 0]
            }
          }
        }
      }
    ])

    res.json({
      success: true,
      data: machinery,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      stats: stats[0] || {
        totalMachinery: 0,
        totalQuantity: 0,
        totalAvailable: 0,
        totalAssigned: 0,
        lowStockCount: 0
      }
    })
  } catch (error) {
    console.error('Error fetching machinery:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch machinery',
      error: error.message
    })
  }
}

// Get single machinery by ID
export const getMachineryById = async (req, res) => {
  try {
    const machinery = await Machinery.findById(req.params.id)
      .populate('assignedProjects.project', 'projectId customer description status')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')

    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      })
    }

    res.json({
      success: true,
      data: machinery
    })
  } catch (error) {
    console.error('Error fetching machinery:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch machinery',
      error: error.message
    })
  }
}

// Create new machinery
export const createMachinery = async (req, res) => {
  try {
    const machineryData = {
      ...req.body,
      createdBy: req.user.id,
      availableQuantity: req.body.quantity || 0
    }

    const machinery = new Machinery(machineryData)
    await machinery.save()

    await machinery.populate('createdBy', 'name')

    res.status(201).json({
      success: true,
      message: 'Machinery created successfully',
      data: machinery
    })
  } catch (error) {
    console.error('Error creating machinery:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create machinery',
      error: error.message
    })
  }
}

// Update machinery
export const updateMachinery = async (req, res) => {
  try {
    const machinery = await Machinery.findById(req.params.id)
    
    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      })
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    }

    // If quantity is being updated, recalculate available quantity
    if (req.body.quantity !== undefined) {
      const assignedQuantity = machinery.assignedProjects.reduce((total, assignment) => {
        if (assignment.status === 'assigned' || assignment.status === 'in_use') {
          return total + assignment.quantity
        }
        return total
      }, 0)
      updateData.availableQuantity = req.body.quantity - assignedQuantity
    }

    const updatedMachinery = await Machinery.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedProjects.project', 'projectId customer description')
     .populate('createdBy', 'name')
     .populate('updatedBy', 'name')

    res.json({
      success: true,
      message: 'Machinery updated successfully',
      data: updatedMachinery
    })
  } catch (error) {
    console.error('Error updating machinery:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update machinery',
      error: error.message
    })
  }
}

// Delete machinery (soft delete)
export const deleteMachinery = async (req, res) => {
  try {
    const machinery = await Machinery.findById(req.params.id)
    
    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      })
    }

    // Check if machinery is currently assigned to any project
    const activeAssignments = machinery.assignedProjects.filter(
      assignment => assignment.status === 'assigned' || assignment.status === 'in_use'
    )

    if (activeAssignments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete machinery that is currently assigned to projects'
      })
    }

    machinery.isActive = false
    machinery.updatedBy = req.user.id
    await machinery.save()

    res.json({
      success: true,
      message: 'Machinery deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting machinery:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete machinery',
      error: error.message
    })
  }
}

// Assign machinery to project
export const assignToProject = async (req, res) => {
  try {
    const { projectId, quantity, expectedReturnDate, notes } = req.body
    
    const machinery = await Machinery.findById(req.params.id)
    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      })
    }

    // Check if project exists
    const project = await Project.findById(projectId)
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      })
    }

    // Check availability
    if (!machinery.isAvailable(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Only ${machinery.availableQuantity} units available`
      })
    }

    await machinery.assignToProject(projectId, quantity, expectedReturnDate, notes)
    
    await machinery.populate('assignedProjects.project', 'projectId customer description')

    res.json({
      success: true,
      message: 'Machinery assigned to project successfully',
      data: machinery
    })
  } catch (error) {
    console.error('Error assigning machinery:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to assign machinery',
      error: error.message
    })
  }
}

// Return machinery from project
export const returnFromProject = async (req, res) => {
  try {
    const { projectId, actualReturnDate, condition, notes } = req.body
    
    const machinery = await Machinery.findById(req.params.id)
    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      })
    }

    await machinery.returnFromProject(projectId, actualReturnDate, condition, notes)
    
    await machinery.populate('assignedProjects.project', 'projectId customer description')

    res.json({
      success: true,
      message: 'Machinery returned from project successfully',
      data: machinery
    })
  } catch (error) {
    console.error('Error returning machinery:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to return machinery',
      error: error.message
    })
  }
}

// Get machinery assignments for a project
export const getProjectAssignments = async (req, res) => {
  try {
    const { projectId } = req.params
    
    const machinery = await Machinery.find({
      'assignedProjects.project': projectId,
      isActive: true
    }).populate('assignedProjects.project', 'projectId customer description')

    const assignments = machinery.flatMap(m => 
      m.assignedProjects
        .filter(assignment => assignment.project._id.toString() === projectId)
        .map(assignment => ({
          ...assignment.toObject(),
          machinery: {
            _id: m._id,
            name: m.name,
            brand: m.brand,
            model: m.model,
            category: m.category
          }
        }))
    )

    res.json({
      success: true,
      data: assignments
    })
  } catch (error) {
    console.error('Error fetching project assignments:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project assignments',
      error: error.message
    })
  }
}

// Upload machinery image
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      })
    }

    const { machineryId } = req.params
    
    // Upload to S3
    const s3Key = `machinery/${machineryId}/${Date.now()}-${req.file.originalname}`
    const imageUrl = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype)

    // Update machinery with image URL
    const machinery = await Machinery.findByIdAndUpdate(
      machineryId,
      {
        $push: {
          images: {
            url: imageUrl,
            filename: req.file.originalname
          }
        }
      },
      { new: true }
    )

    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      })
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,
        filename: req.file.originalname
      }
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    })
  }
}

// Get machinery dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await Machinery.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalMachinery: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalAvailable: { $sum: '$availableQuantity' },
          totalAssigned: { $sum: { $subtract: ['$quantity', '$availableQuantity'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$availableQuantity', 2] }, 1, 0]
            }
          },
          byCategory: {
            $push: {
              category: '$category',
              quantity: '$quantity',
              available: '$availableQuantity'
            }
          }
        }
      }
    ])

    // Get recent assignments
    const recentAssignments = await Machinery.find({
      isActive: true,
      'assignedProjects.0': { $exists: true }
    })
    .populate('assignedProjects.project', 'projectId customer')
    .sort({ 'assignedProjects.assignedDate': -1 })
    .limit(5)

    res.json({
      success: true,
      data: {
        stats: stats[0] || {
          totalMachinery: 0,
          totalQuantity: 0,
          totalAvailable: 0,
          totalAssigned: 0,
          lowStockCount: 0
        },
        recentAssignments: recentAssignments.flatMap(m => 
          m.assignedProjects.slice(0, 1).map(assignment => ({
            ...assignment.toObject(),
            machineryName: m.name
          }))
        ).slice(0, 5)
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    })
  }
}
