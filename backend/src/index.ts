import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { db, checkDatabaseConnection } from './db/index.js';
import { redis } from './utils/redis.js';
import { logger } from './utils/logger.js';

// Routes
import authRoutes from './api/routes/auth.js';
import campaignsRoutes from './api/routes/campaigns.js';
import contactsRoutes from './api/routes/contacts.js';
import emailRoutes from './api/routes/email.js';
import linkedinRoutes from './api/routes/linkedin.js';
import templatesRoutes from './api/routes/templates.js';
import analyticsRoutes from './api/routes/analytics.js';
import trackingRoutes from './api/routes/tracking.js';
import webhooksRoutes from './api/routes/webhooks.js';

const app = Fastify({
  logger,
  disableRequestLogging: process.env.NODE_ENV === 'production',
});

// Plugins
await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET!,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  redis,
});

// Decorators
app.decorate('db', db);
app.decorate('redis', redis);

// Hooks
app.addHook('onRequest', async (request, reply) => {
  request.log.info({ url: request.url, method: request.method }, 'Incoming request');
});

// Health check
app.get('/health', async (request, reply) => {
  const dbOk = await checkDatabaseConnection();
  const redisOk = redis.status === 'ready';

  if (!dbOk || !redisOk) {
    return reply.status(503).send({
      status: 'unhealthy',
      database: dbOk ? 'ok' : 'down',
      redis: redisOk ? 'ok' : 'down',
    });
  }

  return { status: 'ok', database: 'ok', redis: 'ok' };
});

// Routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(campaignsRoutes, { prefix: '/api/campaigns' });
await app.register(contactsRoutes, { prefix: '/api/contacts' });
await app.register(emailRoutes, { prefix: '/api/email' });
await app.register(linkedinRoutes, { prefix: '/api/linkedin' });
await app.register(templatesRoutes, { prefix: '/api/templates' });
await app.register(analyticsRoutes, { prefix: '/api/analytics' });
await app.register(trackingRoutes, { prefix: '/api/tracking' });
await app.register(webhooksRoutes, { prefix: '/api/webhooks' });

// Error handler
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  return reply.status(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong',
  });
});

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, closing server gracefully...`);
    await app.close();
    await redis.quit();
    process.exit(0);
  });
});

// Start
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    logger.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
