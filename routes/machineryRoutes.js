import express from 'express'
import {
  getAllMachinery,
  getMachineryById,
  createMachinery,
  updateMachinery,
  deleteMachinery,
  assignToProject,
  returnFromProject,
  getProjectAssignments,
  uploadImage,
  getDashboardStats
} from '../controllers/machineryController.js'
import { protect } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats)

// CRUD operations
router.get('/', getAllMachinery)
router.get('/:id', getMachineryById)
router.post('/', createMachinery)
router.put('/:id', updateMachinery)
router.delete('/:id', deleteMachinery)

// Project assignments
router.post('/:id/assign', assignToProject)
router.post('/:id/return', returnFromProject)
router.get('/project/:projectId/assignments', getProjectAssignments)

// File uploads
router.post('/:machineryId/upload-image', upload.single('image'), uploadImage)

export default router
