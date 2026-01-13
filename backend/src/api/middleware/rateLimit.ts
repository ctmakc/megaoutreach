import { FastifyRequest, FastifyReply } from 'fastify';

export const rateLimiter = (options: { windowMs: number; max: number }) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement rate limiting using Redis
    // For now, just pass through
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
