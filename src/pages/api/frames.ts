import type { NextApiRequest, NextApiResponse } from "next";
import { framesService } from '../../lib/frames-service';
import { withRateLimit } from '../../lib/rate-limiter';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { season, episode, page = '1', limit = 'all' } = req.query;

  const limitValue = limit === 'all' ? undefined : parseInt(limit as string);
  const pageValue = limit === 'all' ? 1 : parseInt(page as string);

  const result = await framesService.getFrames({
    season: season as string,
    episode: episode as string,
    page: pageValue,
    limit: limitValue
  });

  const statusCode = result.success ? 200 : 500;
  return res.status(statusCode).json(result);
}

export default withRateLimit(handler, {
  windowMs: 60000, // 1 minute
  maxRequests: 60 // 60 requests per minute
});