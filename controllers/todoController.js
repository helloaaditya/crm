import Todo from '../models/Todo.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createNotification } from './notificationController.js';

// @desc    Get all todos (with filters)
// @route   GET /api/todos
// @access  Private
export const getTodos = asyncHandler(async (req, res) => {
  const { 
    status, 
    priority, 
    assignedTo, 
    createdBy,
    search,
    dueDateFrom,
    dueDateTo,
    page = 1, 
    limit = 50,
    project,
    customer
  } = req.query;

  const user = req.user;
  let query = {};

  // If user doesn't have 'todo' or 'all' module access, they can only see their own todos
  const userModules = user.module ? user.module.split(',').map(m => m.trim()) : [];
  const hasTodoAccess = userModules.includes('todo') || userModules.includes('all') || user.module === 'all';
  
  if (!hasTodoAccess) {
    // Regular employees can only see their own todos
    const employee = await Employee.findOne({ userId: user._id });
    if (employee) {
      query.assignedTo = employee._id;
    } else {
      return res.json({
        success: true,
        data: [],
        totalPages: 0,
        currentPage: 1,
        total: 0
      });
    }
  }

  // Apply filters
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;
  if (createdBy) query.createdBy = createdBy;
  if (project) query.project = project;
  if (customer) query.customer = customer;

  if (dueDateFrom || dueDateTo) {
    query.dueDate = {};
    if (dueDateFrom) query.dueDate.$gte = new Date(dueDateFrom);
    if (dueDateTo) query.dueDate.$lte = new Date(dueDateTo);
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  const todos = await Todo.find(query)
    .populate('assignedTo', 'name employeeId')
    .populate('createdBy', 'name email')
    .populate('project', 'name projectId')
    .populate('customer', 'name customerId')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Todo.countDocuments(query);

  res.json({
    success: true,
    data: todos,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    total: count
  });
});

// @desc    Get single todo
// @route   GET /api/todos/:id
// @access  Private
export const getTodoById = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id)
    .populate('assignedTo', 'name employeeId')
    .populate('createdBy', 'name email')
    .populate('project', 'name projectId')
    .populate('customer', 'name customerId');

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: 'Todo not found'
    });
  }

  // Check access
  const user = req.user;
  const userModules = user.module ? user.module.split(',').map(m => m.trim()) : [];
  const hasTodoAccess = userModules.includes('todo') || userModules.includes('all') || user.module === 'all';
  const employee = await Employee.findOne({ userId: user._id });

  if (!hasTodoAccess && employee && todo.assignedTo._id.toString() !== employee._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this todo'
    });
  }

  res.json({
    success: true,
    data: todo
  });
});

// @desc    Create todo
// @route   POST /api/todos
// @access  Private
export const createTodo = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    status,
    priority,
    dueDate,
    assignedTo,
    tags,
    notes,
    estimatedHours,
    project,
    customer
  } = req.body;

  const user = req.user;

  // If assignedTo is not provided, assign to current user's employee profile
  let finalAssignedTo = assignedTo;
  if (!finalAssignedTo) {
    const currentEmployee = await Employee.findOne({ userId: user._id });
    if (!currentEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee profile not found. Please assign to an employee.'
      });
    }
    finalAssignedTo = currentEmployee._id;
  }

  // Validate assignedTo
  const assignedEmployee = await Employee.findById(finalAssignedTo);
  if (!assignedEmployee) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee assigned'
    });
  }

  // Convert empty strings to undefined for optional ObjectId fields
  const finalProject = project && project.trim() !== '' ? project : undefined;
  const finalCustomer = customer && customer.trim() !== '' ? customer : undefined;

  const todo = await Todo.create({
    title,
    description,
    status: status || 'pending',
    priority: priority || 'medium',
    dueDate: dueDate ? new Date(dueDate) : undefined,
    assignedTo: finalAssignedTo,
    createdBy: user._id,
    tags: tags || [],
    notes,
    estimatedHours,
    project: finalProject,
    customer: finalCustomer
  });

  const populatedTodo = await Todo.findById(todo._id)
    .populate('assignedTo', 'name employeeId')
    .populate('createdBy', 'name email')
    .populate('project', 'name projectId')
    .populate('customer', 'name customerId');

  // Create notification for assigned employee
  if (assignedEmployee.userId) {
    await createNotification({
      userId: assignedEmployee.userId,
      type: 'todo_assigned',
      title: 'New Todo Assigned',
      message: `You have been assigned a new todo: ${title}`,
      link: `/my-todos`,
      relatedId: todo._id
    });
  }

  res.status(201).json({
    success: true,
    data: populatedTodo
  });
});

// @desc    Update todo
// @route   PUT /api/todos/:id
// @access  Private
export const updateTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: 'Todo not found'
    });
  }

  // Check access
  const user = req.user;
  const userModules = user.module ? user.module.split(',').map(m => m.trim()) : [];
  const hasTodoAccess = userModules.includes('todo') || userModules.includes('all') || user.module === 'all';
  const employee = await Employee.findOne({ userId: user._id });

  if (!hasTodoAccess && employee && todo.assignedTo.toString() !== employee._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to update this todo'
    });
  }

  const {
    title,
    description,
    status,
    priority,
    dueDate,
    assignedTo,
    tags,
    notes,
    estimatedHours,
    actualHours,
    project,
    customer
  } = req.body;

  // Update fields
  if (title !== undefined) todo.title = title;
  if (description !== undefined) todo.description = description;
  if (status !== undefined) todo.status = status;
  if (priority !== undefined) todo.priority = priority;
  if (dueDate !== undefined) todo.dueDate = dueDate ? new Date(dueDate) : null;
  if (assignedTo !== undefined) {
    const assignedEmployee = await Employee.findById(assignedTo);
    if (!assignedEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee assigned'
      });
    }
    todo.assignedTo = assignedTo;
    
    // Notify new assignee if changed
    if (todo.assignedTo.toString() !== assignedTo) {
      if (assignedEmployee.userId) {
        await createNotification({
          userId: assignedEmployee.userId,
          type: 'todo_assigned',
          title: 'Todo Reassigned',
          message: `A todo has been reassigned to you: ${todo.title}`,
          link: `/my-todos`,
          relatedId: todo._id
        });
      }
    }
  }
  if (tags !== undefined) todo.tags = tags;
  if (notes !== undefined) todo.notes = notes;
  if (estimatedHours !== undefined) todo.estimatedHours = estimatedHours;
  if (actualHours !== undefined) todo.actualHours = actualHours;
  // Convert empty strings to null for optional ObjectId fields
  if (project !== undefined) todo.project = (project && project.trim() !== '') ? project : null;
  if (customer !== undefined) todo.customer = (customer && customer.trim() !== '') ? customer : null;

  await todo.save();

  const updatedTodo = await Todo.findById(todo._id)
    .populate('assignedTo', 'name employeeId')
    .populate('createdBy', 'name email')
    .populate('project', 'name projectId')
    .populate('customer', 'name customerId');

  res.json({
    success: true,
    data: updatedTodo
  });
});

// @desc    Delete todo
// @route   DELETE /api/todos/:id
// @access  Private
export const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: 'Todo not found'
    });
  }

  // Check access - only creator or admin can delete
  const user = req.user;
  const userModules = user.module ? user.module.split(',').map(m => m.trim()) : [];
  const hasTodoAccess = userModules.includes('todo') || userModules.includes('all') || user.module === 'all';

  if (!hasTodoAccess && todo.createdBy.toString() !== user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to delete this todo'
    });
  }

  await Todo.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Todo deleted successfully'
  });
});

// @desc    Get performance and productivity stats
// @route   GET /api/todos/stats/performance
// @access  Private (todo module access required)
export const getPerformanceStats = asyncHandler(async (req, res) => {
  const user = req.user;
  const userModules = user.module ? user.module.split(',').map(m => m.trim()) : [];
  const hasTodoAccess = userModules.includes('todo') || userModules.includes('all') || user.module === 'all';

  if (!hasTodoAccess) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this module'
    });
  }

  const { employeeId, startDate, endDate } = req.query;

  let matchQuery = {};

  if (employeeId) {
    matchQuery.assignedTo = employeeId;
  }

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  // Get all todos with match query
  const todos = await Todo.find(matchQuery)
    .populate('assignedTo', 'name employeeId');

  // Calculate stats
  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.status === 'completed').length;
  const pendingTodos = todos.filter(t => t.status === 'pending').length;
  const inProgressTodos = todos.filter(t => t.status === 'in_progress').length;
  const cancelledTodos = todos.filter(t => t.status === 'cancelled').length;

  const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // Calculate by priority
  const urgentCompleted = todos.filter(t => t.priority === 'urgent' && t.status === 'completed').length;
  const urgentTotal = todos.filter(t => t.priority === 'urgent').length;
  const urgentCompletionRate = urgentTotal > 0 ? (urgentCompleted / urgentTotal) * 100 : 0;

  const highCompleted = todos.filter(t => t.priority === 'high' && t.status === 'completed').length;
  const highTotal = todos.filter(t => t.priority === 'high').length;
  const highCompletionRate = highTotal > 0 ? (highCompleted / highTotal) * 100 : 0;

  // Calculate time efficiency
  const todosWithTime = todos.filter(t => t.estimatedHours && t.actualHours);
  const totalEstimatedHours = todos.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalActualHours = todos.reduce((sum, t) => sum + (t.actualHours || 0), 0);
  const timeEfficiency = totalEstimatedHours > 0 
    ? ((totalEstimatedHours - totalActualHours) / totalEstimatedHours) * 100 
    : 0;

  // Calculate on-time completion
  const todosWithDueDate = todos.filter(t => t.dueDate);
  const onTimeCompleted = todosWithDueDate.filter(t => {
    if (t.status !== 'completed' || !t.completedDate) return false;
    return new Date(t.completedDate) <= new Date(t.dueDate);
  }).length;
  const onTimeRate = todosWithDueDate.length > 0 
    ? (onTimeCompleted / todosWithDueDate.length) * 100 
    : 0;

  // Group by employee
  const employeeStats = {};
  todos.forEach(todo => {
    const empId = todo.assignedTo?._id?.toString() || 'unknown';
    const empName = todo.assignedTo?.name || 'Unknown';
    const empEmployeeId = todo.assignedTo?.employeeId || 'N/A';

    if (!employeeStats[empId]) {
      employeeStats[empId] = {
        employeeId: empEmployeeId,
        name: empName,
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        cancelled: 0,
        completionRate: 0,
        onTimeCompleted: 0,
        onTimeRate: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        timeEfficiency: 0
      };
    }

    employeeStats[empId].total++;
    if (todo.status === 'completed') employeeStats[empId].completed++;
    if (todo.status === 'pending') employeeStats[empId].pending++;
    if (todo.status === 'in_progress') employeeStats[empId].inProgress++;
    if (todo.status === 'cancelled') employeeStats[empId].cancelled++;

    if (todo.dueDate && todo.status === 'completed' && todo.completedDate) {
      if (new Date(todo.completedDate) <= new Date(todo.dueDate)) {
        employeeStats[empId].onTimeCompleted++;
      }
    }

    if (todo.estimatedHours) employeeStats[empId].totalEstimatedHours += todo.estimatedHours;
    if (todo.actualHours) employeeStats[empId].totalActualHours += todo.actualHours;
  });

  // Calculate rates for each employee
  Object.keys(employeeStats).forEach(empId => {
    const stats = employeeStats[empId];
    stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    stats.onTimeRate = stats.total > 0 ? (stats.onTimeCompleted / stats.total) * 100 : 0;
    stats.timeEfficiency = stats.totalEstimatedHours > 0 
      ? ((stats.totalEstimatedHours - stats.totalActualHours) / stats.totalEstimatedHours) * 100 
      : 0;
  });

  res.json({
    success: true,
    data: {
      overall: {
        totalTodos,
        completedTodos,
        pendingTodos,
        inProgressTodos,
        cancelledTodos,
        completionRate: parseFloat(completionRate.toFixed(2)),
        urgentCompletionRate: parseFloat(urgentCompletionRate.toFixed(2)),
        highCompletionRate: parseFloat(highCompletionRate.toFixed(2)),
        timeEfficiency: parseFloat(timeEfficiency.toFixed(2)),
        onTimeRate: parseFloat(onTimeRate.toFixed(2)),
        totalEstimatedHours,
        totalActualHours
      },
      byEmployee: Object.values(employeeStats)
    }
  });
});

// @desc    Get my todos (for employee)
// @route   GET /api/todos/my
// @access  Private
export const getMyTodos = asyncHandler(async (req, res) => {
  const { status, priority, search, dueDateFrom, dueDateTo, page = 1, limit = 50 } = req.query;

  const user = req.user;
  const employee = await Employee.findOne({ userId: user._id });

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee profile not found'
    });
  }

  let query = { assignedTo: employee._id };

  if (status) query.status = status;
  if (priority) query.priority = priority;

  if (dueDateFrom || dueDateTo) {
    query.dueDate = {};
    if (dueDateFrom) query.dueDate.$gte = new Date(dueDateFrom);
    if (dueDateTo) query.dueDate.$lte = new Date(dueDateTo);
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  const todos = await Todo.find(query)
    .populate('createdBy', 'name email')
    .populate('project', 'name projectId')
    .populate('customer', 'name customerId')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Todo.countDocuments(query);

  res.json({
    success: true,
    data: todos,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    total: count
  });
});

