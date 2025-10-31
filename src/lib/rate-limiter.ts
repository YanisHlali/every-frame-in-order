import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.requests = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (entry.resetTime < now) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  private getClientIdentifier(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];

    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip.trim();
    }

    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return req.socket.remoteAddress || 'unknown';
  }

  checkLimit(
    req: NextApiRequest,
    res: NextApiResponse,
    options: {
      windowMs?: number;
      maxRequests?: number;
    } = {}
  ): boolean {
    const {
      windowMs = 60000, // 1 minute
      maxRequests = 60 // 60 requests per minute
    } = options;

    const identifier = this.getClientIdentifier(req);
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || entry.resetTime < now) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      this.setRateLimitHeaders(res, maxRequests, maxRequests - 1, windowMs);
      return true;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      this.setRateLimitHeaders(res, maxRequests, 0, Math.ceil((entry.resetTime - now)));
      return false;
    }

    entry.count++;
    this.requests.set(identifier, entry);
    this.setRateLimitHeaders(res, maxRequests, maxRequests - entry.count, Math.ceil((entry.resetTime - now)));
    return true;
  }

  private setRateLimitHeaders(
    res: NextApiResponse,
    limit: number,
    remaining: number,
    resetMs: number
  ): void {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + resetMs).toISOString());
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

const rateLimiter = new RateLimiter();

export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options?: {
    windowMs?: number;
    maxRequests?: number;
  }
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const allowed = rateLimiter.checkLimit(req, res, options);

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }

    return handler(req, res);
  };
}

export default rateLimiter;
