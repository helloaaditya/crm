import express from 'express';
import { protect, moduleAccess } from '../middleware/auth.js';
import {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  getPerformanceStats,
  getMyTodos
} from '../controllers/todoController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// My todos route (for employees) - should be before /:id
router.get('/my', getMyTodos);

// Performance stats route (requires todo module access)
router.get('/stats/performance', moduleAccess('todo', 'all'), getPerformanceStats);

// Get all todos (with access control)
router.get('/', getTodos);

// Get single todo
router.get('/:id', getTodoById);

// Create todo (requires todo module access or can create own)
router.post('/', createTodo);

// Update todo
router.put('/:id', updateTodo);

// Delete todo
router.delete('/:id', deleteTodo);

export default router;

