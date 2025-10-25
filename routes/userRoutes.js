import express from 'express';
import { protect, authorize, checkPermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all users (admin only)
router.get('/', authorize('main_admin', 'sub_admin'), async (req, res) => {
  // Controller logic here
  res.json({ message: 'Get all users' });
});

// Create user (admin only)
router.post('/', authorize('main_admin', 'sub_admin'), checkPermission('canCreate'), async (req, res) => {
  res.json({ message: 'Create user' });
});

// Get user by ID
router.get('/:id', async (req, res) => {
  res.json({ message: 'Get user by ID' });
});

// Update user
router.put('/:id', checkPermission('canEdit'), async (req, res) => {
  res.json({ message: 'Update user' });
});

// Delete user
router.delete('/:id', authorize('main_admin'), checkPermission('canDelete'), async (req, res) => {
  res.json({ message: 'Delete user' });
});

export default router;
