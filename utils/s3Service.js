import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Upload file to S3
export const uploadToS3 = async (file, folder = 'general') => {
  try {
    const fileContent = fs.readFileSync(file.path);
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${folder}/${Date.now()}-${file.originalname}`,
      Body: fileContent,
      ContentType: file.mimetype
      // Removed ACL parameter as the bucket doesn't allow ACLs
    };

    const result = await s3.upload(params).promise();
    
    // Delete local file after upload
    fs.unlinkSync(file.path);
    
    return {
      url: result.Location,
      key: result.Key
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

// Upload multiple files
export const uploadMultipleToS3 = async (files, folder = 'general') => {
  try {
    const uploadPromises = files.map(file => uploadToS3(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('S3 Multiple Upload Error:', error);
    throw new Error('Failed to upload files to S3');
  }
};

// Upload a local file path to S3 (no Multer dependency)
export const uploadFilePathToS3 = async (filePath, key, contentType = 'application/octet-stream') => {
  try {
    if (!process.env.S3_BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME not configured');
    }

    const bodyStream = fs.createReadStream(filePath);
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: bodyStream,
      ContentType: contentType
      // Removed ACL parameter as the bucket doesn't allow ACLs
    };

    const result = await s3.upload(params).promise();
    return { url: result.Location, key: result.Key };
  } catch (error) {
    console.error('S3 uploadFilePathToS3 Error:', error);
    throw error;
  }
};

// Upload a buffer to S3 (for multer memory storage)
export const uploadBufferToS3 = async (buffer, key, contentType = 'application/octet-stream') => {
  try {
    if (!process.env.S3_BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME not configured');
    }

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType
    };

    const result = await s3.upload(params).promise();
    return { url: result.Location, key: result.Key };
  } catch (error) {
    console.error('S3 uploadBufferToS3 Error:', error);
    throw error;
  }
};

// Upload multiple buffers (from multer memoryStorage files)
export const uploadMultipleFromMemory = async (files, folder = 'general') => {
  try {
    if (!process.env.S3_BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME not configured');
    }

    const uploads = files.map(async (file) => {
      const key = `${folder}/${Date.now()}-${file.originalname}`;
      return await uploadBufferToS3(file.buffer, key, file.mimetype);
    });
    return await Promise.all(uploads);
  } catch (error) {
    console.error('S3 uploadMultipleFromMemory Error:', error);
    throw error;
  }
};

// Delete file from S3
export const deleteFromS3 = async (fileKey) => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

// Get signed URL (for private files)
export const getSignedUrl = (fileKey, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Expires: expiresIn
    };

    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error('Failed to generate signed URL');
  }
};
