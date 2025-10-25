import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  getAllUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
  makeUserAdmin,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required')
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], forgotPassword);

router.put('/reset-password/:resetToken', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.get('/users', protect, getAllUsers);
router.put('/users/:id', protect, updateUser);
router.put('/users/:id/make-admin', protect, makeUserAdmin);
router.delete('/users/:id', protect, deleteUser);
router.put('/users/:id/reset-password', protect, resetUserPassword);
router.put('/update-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], updatePassword);
router.post('/logout', protect, logout);

export default router;
