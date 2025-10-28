import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// System Health Check Utility
export const performHealthCheck = async () => {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
    errors: []
  };

  try {
    // 1. Database Connection Check
    try {
      const dbState = mongoose.connection.readyState;
      healthStatus.services.database = {
        status: dbState === 1 ? 'connected' : 'disconnected',
        readyState: dbState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      };
      
      if (dbState !== 1) {
        healthStatus.errors.push('Database connection is not established');
        healthStatus.status = 'unhealthy';
      }
    } catch (error) {
      healthStatus.services.database = {
        status: 'error',
        error: error.message
      };
      healthStatus.errors.push(`Database error: ${error.message}`);
      healthStatus.status = 'unhealthy';
    }

    // 2. Environment Variables Check
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'NODE_ENV',
      'PORT'
    ];

    const optionalEnvVars = [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASSWORD',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY'
    ];

    healthStatus.services.environment = {
      required: {},
      optional: {},
      missing: []
    };

    // Check required environment variables
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        healthStatus.services.environment.required[envVar] = 'configured';
      } else {
        healthStatus.services.environment.required[envVar] = 'missing';
        healthStatus.services.environment.missing.push(envVar);
        healthStatus.errors.push(`Required environment variable missing: ${envVar}`);
        healthStatus.status = 'unhealthy';
      }
    });

    // Check optional environment variables
    optionalEnvVars.forEach(envVar => {
      healthStatus.services.environment.optional[envVar] = process.env[envVar] ? 'configured' : 'not_configured';
    });

    // 3. File System Check
    try {
      const uploadDirs = [
        'uploads',
        'uploads/invoices',
        'uploads/projects',
        'uploads/documents',
        'uploads/profiles',
        'uploads/payslips',
        'uploads/certificates'
      ];

      healthStatus.services.filesystem = {
        uploadDirectories: {}
      };

      uploadDirs.forEach(dir => {
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            healthStatus.services.filesystem.uploadDirectories[dir] = 'created';
          } else {
            healthStatus.services.filesystem.uploadDirectories[dir] = 'exists';
          }
        } catch (error) {
          healthStatus.services.filesystem.uploadDirectories[dir] = 'error';
          healthStatus.errors.push(`Failed to create directory ${dir}: ${error.message}`);
          healthStatus.status = 'unhealthy';
        }
      });
    } catch (error) {
      healthStatus.services.filesystem = {
        status: 'error',
        error: error.message
      };
      healthStatus.errors.push(`File system error: ${error.message}`);
      healthStatus.status = 'unhealthy';
    }

    // 4. External Services Check
    healthStatus.services.external = {};

    // Check Razorpay configuration
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      healthStatus.services.external.razorpay = 'configured';
    } else {
      healthStatus.services.external.razorpay = 'not_configured';
    }

    // Check Email configuration
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      healthStatus.services.external.email = 'configured';
    } else {
      healthStatus.services.external.email = 'not_configured';
    }

    // Check AWS S3 configuration
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME) {
      healthStatus.services.external.aws_s3 = 'configured';
    } else {
      healthStatus.services.external.aws_s3 = 'not_configured';
    }

    // 5. Memory Usage Check
    const memUsage = process.memoryUsage();
    healthStatus.services.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    };

    // 6. Uptime Check
    healthStatus.services.uptime = {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(process.uptime())
    };

  } catch (error) {
    healthStatus.status = 'error';
    healthStatus.errors.push(`Health check error: ${error.message}`);
  }

  return healthStatus;
};

// Format uptime in human readable format
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${secs}s`;

  return result.trim();
};

// Quick health check for API endpoints
export const quickHealthCheck = async () => {
  try {
    const dbState = mongoose.connection.readyState;
    return {
      status: dbState === 1 ? 'healthy' : 'unhealthy',
      database: dbState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

