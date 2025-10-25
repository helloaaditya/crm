import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: 'User account is deactivated' });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Module-based authorization
export const moduleAccess = (...modules) => {
  return (req, res, next) => {
    // If user has 'all' access, they can access everything
    if (req.user.module === 'all') {
      return next();
    }
    
    // Split user modules by comma for multiple module support
    const userModules = req.user.module ? req.user.module.split(',') : [];
    
    // Check if user has access to any of the required modules
    const hasAccess = modules.some(module => userModules.includes(module));
    
    if (hasAccess) {
      next();
    } else {
      return res.status(403).json({
        message: `You don't have access to this module`
      });
    }
  };
};

// Permission-based authorization
export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        message: `You don't have permission to ${permission}`
      });
    }
    next();
  };
};

// Generate JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};