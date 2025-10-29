import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import machineryRoutes from './routes/machineryRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import invoiceSettingsRoutes from './routes/invoiceSettingsRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://crm-chi-rouge.vercel.app',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Fallback: echo any origin if explicitly allowed via env
    if (process.env.CORS_ALLOW_ALL === 'true') return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    console.log('Serving static file:', path);
  }
}));

// Direct PDF serving route as fallback
app.get('/uploads/invoices/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'invoices', filename);
  
  console.log('Direct PDF request for:', filename);
  console.log('File path:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    // List available files for debugging
    const uploadsDir = path.join(__dirname, 'uploads', 'invoices');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log('Available PDF files:', files);
    }
    return res.status(404).json({ 
      message: 'PDF file not found',
      requestedFile: filename,
      availableFiles: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
    });
  }
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/machinery', machineryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoice-settings', invoiceSettingsRoutes);

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const { quickHealthCheck } = await import('./utils/healthCheck.js');
    const health = await quickHealthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    const { performHealthCheck } = await import('./utils/healthCheck.js');
    const health = await performHealthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Migration endpoint for updating user modules
app.post('/api/migrate/user-modules', async (req, res) => {
  try {
    const User = (await import('./models/User.js')).default;
    
    // Update users with 'none' module access to 'all'
    const result = await User.updateMany(
      { module: 'none' },
      { $set: { module: 'all' } }
    );

    // Also update users with empty or null module
    const result2 = await User.updateMany(
      { $or: [{ module: { $exists: false } }, { module: null }, { module: '' }] },
      { $set: { module: 'all' } }
    );

    // Get current user module distribution
    const moduleStats = await User.aggregate([
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      message: 'User module migration completed',
      updatedNone: result.modifiedCount,
      updatedEmpty: result2.modifiedCount,
      moduleStats
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CORS preflight test endpoint
app.get('/cors-test', (req, res) => {
  res.status(200).json({ 
    status: 'CORS OK', 
    message: 'CORS is properly configured',
    origin: req.get('origin'),
    allowedOrigins: [
      'http://localhost:3000',
      'https://crm-chi-rouge.vercel.app'
    ]
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Database connection with enhanced error handling
const connectDB = async () => {
  try {
    // Validate MongoDB URI
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB Reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('💡 Please check:');
    console.error('   1. MongoDB server is running');
    console.error('   2. MONGODB_URI is correctly set in .env file');
    console.error('   3. Network connectivity to MongoDB server');
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

export default app;