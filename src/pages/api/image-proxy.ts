import type { NextApiRequest, NextApiResponse } from 'next';
import { withRateLimit } from '../../lib/rate-limiter';

// Maximum image size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function isValidGoogleUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const allowedHosts = ['lh3.googleusercontent.com', 'drive.google.com'];
    return allowedHosts.includes(url.hostname) && url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  if (!isValidGoogleUrl(url)) {
    return res.status(400).json({ error: 'Only Google Drive URLs are allowed' });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: 'Image too large' });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: 'Image too large' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', buffer.byteLength);

    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy image' });
  }
}

export default withRateLimit(handler, {
  windowMs: 60000, // 1 minute
  maxRequests: 120 // 120 requests per minute (higher for images)
});