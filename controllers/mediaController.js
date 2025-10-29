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
  if (!process.env.S3_BUCKET_NAME) {
    return res.status(500).json({ message: 'S3 bucket not configured' });
  }
  const objectKey = key || extractKeyFromUrl(url);
  if (!objectKey) {
    return res.status(400).json({ message: 'Missing media key or url' });
  }

  try {
    // Get metadata for headers
    const head = await s3.headObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: objectKey
    }).promise();

    res.setHeader('Content-Type', head.ContentType || 'application/octet-stream');
    if (head.ContentLength) res.setHeader('Content-Length', head.ContentLength.toString());
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = s3.getObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: objectKey
    }).createReadStream();

    stream.on('error', (err) => {
      console.error('S3 stream error:', err);
      if (!res.headersSent) res.status(500).end('Failed to stream media');
    });

    stream.pipe(res);
  } catch (error) {
    console.error('Media proxy error:', error);
    res.status(500).json({ message: 'Failed to load media' });
  }
});


