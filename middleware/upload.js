import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure storage (disk) - used only where explicitly needed
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'projectImages') {
      uploadPath = 'uploads/projects/';
    } else if (file.fieldname === 'invoice') {
      uploadPath = 'uploads/invoices/';
    } else if (file.fieldname === 'documents') {
      uploadPath = 'uploads/documents/';
    } else if (file.fieldname === 'profileImage') {
      uploadPath = 'uploads/profiles/';
    } else if (file.fieldname === 'apk') {
      uploadPath = 'uploads/apk/';
    }
    
    // Ensure the directory exists
    ensureDirectoryExists(uploadPath);
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (allow common media + docs + CSV/Excel for bulk import + APK)
const fileFilter = (req, file, cb) => {
  // Special handling for APK files
  if (file.fieldname === 'apk') {
    const isApk = /\.apk$/i.test(file.originalname) || file.mimetype === 'application/vnd.android.package-archive' || file.mimetype === 'application/octet-stream';
    if (isApk) {
      return cb(null, true);
    } else {
      return cb(new Error('Invalid file type. Only APK files are allowed.'));
    }
  }
  
  // Allowed file types for other uploads
  const allowedTypes = /jpeg|jpg|png|gif|mp3|wav|m4a|m4b|aac|oga|ogg|3gp|3gpp|mp4|webm|avi|pdf|doc|docx|xls|xlsx|txt|csv|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, and CSV/Excel are allowed.'));
  }
};

// Multer upload configuration (disk)
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// APK upload configuration (larger file size limit)
export const apkUpload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for APK files
  },
  fileFilter: (req, file, cb) => {
    const isApk = /\.apk$/i.test(file.originalname) || file.mimetype === 'application/vnd.android.package-archive' || file.mimetype === 'application/octet-stream';
    if (isApk) {
      return cb(null, true);
    } else {
      return cb(new Error('Invalid file type. Only APK files are allowed.'));
    }
  }
});

// Image only upload
export const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Multer upload configuration (memory) - preferred for S3 uploads
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});
