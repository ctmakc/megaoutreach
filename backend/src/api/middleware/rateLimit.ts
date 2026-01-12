import { Request, Response, NextFunction } from 'express';

export const rateLimiter = (options: { windowMs: number; max: number }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement rate limiting using Redis
    next();
  };
};

export const apiRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
});

export const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5
});
