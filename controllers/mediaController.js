import AWS from 'aws-sdk';
import { asyncHandler } from '../middleware/errorHandler.js';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const extractKeyFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    // pathname starts with '/'
    return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    return url; // fallback if already a key
  }
};

export const proxyS3Media = asyncHandler(async (req, res) => {
  const { url, key } = req.query;
  
  console.log('Media proxy request:', { url, key });
  
  if (!process.env.S3_BUCKET_NAME) {
    console.error('S3_BUCKET_NAME not configured');
    return res.status(500).json({ message: 'S3 bucket not configured' });
  }
  
  const objectKey = key || extractKeyFromUrl(url);
  console.log('Extracted S3 key:', objectKey);
  
  if (!objectKey) {
    return res.status(400).json({ message: 'Missing media key or url' });
  }

  try {
    console.log('Fetching from S3:', { bucket: process.env.S3_BUCKET_NAME, key: objectKey });
    
    // Get metadata for headers
    const head = await s3.headObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: objectKey
    }).promise();

    console.log('S3 object found, ContentType:', head.ContentType, 'Size:', head.ContentLength);

    res.setHeader('Content-Type', head.ContentType || 'application/octet-stream');
    if (head.ContentLength) res.setHeader('Content-Length', head.ContentLength.toString());
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = s3.getObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: objectKey
    }).createReadStream();

    stream.on('error', (err) => {
      console.error('S3 stream error:', err);
      if (!res.headersSent) {
        res.status(500).end('Failed to stream media');
      }
    });

    stream.pipe(res);
  } catch (error) {
    console.error('Media proxy error:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      bucket: process.env.S3_BUCKET_NAME,
      key: objectKey
    });
    
    if (error.code === 'NoSuchKey') {
      return res.status(404).json({ message: 'Media file not found in S3' });
    }
    if (error.code === 'AccessDenied') {
      return res.status(403).json({ message: 'Access denied to S3 object' });
    }
    
    res.status(500).json({ 
      message: 'Failed to load media',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


