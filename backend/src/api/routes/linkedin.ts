import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { linkedinAccounts, contacts, messages } from '../../db/schema.js';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const linkedinAccountSchema = z.object({
  linkedinUrl: z.string().optional(),
  name: z.string().optional(),
  proxyUrl: z.string().optional(),
  dailyConnectionLimit: z.number().default(20),
  dailyMessageLimit: z.number().default(50),
});

const linkedinRoutes: FastifyPluginAsync = async (app) => {
  // List LinkedIn accounts
  app.get('/accounts', {
    preHandler: [authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;

    const accounts = await db.query.linkedinAccounts.findMany({
      where: eq(linkedinAccounts.organizationId, organizationId),
      orderBy: [desc(linkedinAccounts.createdAt)],
    });

    return { accounts };
  });

  // Get single LinkedIn account
  app.get('/accounts/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;

    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'LinkedIn account not found' };
    }
    
    // Get recent actions
    // TODO: Implement linkedinActions table
    const recentActions: any[] = [];

    return { ...account, recentActions };
  });

  // Add LinkedIn account (simplified - just creates placeholder)
  app.post('/accounts', {
    preHandler: [authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = linkedinAccountSchema.parse(request.body);
    
    const [account] = await db.insert(linkedinAccounts).values({
      linkedinUrl: data.linkedinUrl,
      name: data.name,
      proxyUrl: data.proxyUrl,
      dailyConnectionLimit: data.dailyConnectionLimit,
      dailyMessageLimit: data.dailyMessageLimit,
      organizationId,
      status: 'verification_needed',
    }).returning();
    
    return {
      ...account,
      message: 'LinkedIn account placeholder created. Login flow not yet implemented.',
    };
  });

  // Update LinkedIn account
  app.patch('/accounts/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const data = linkedinAccountSchema.partial().parse(request.body);

    const [updated] = await db.update(linkedinAccounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ))
      .returning();

    if (!updated) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    return updated;
  });

  // Delete LinkedIn account
  app.delete('/accounts/:id', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;

    await db.delete(linkedinAccounts)
      .where(and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ));

    return reply.status(204).send();
  });

  // Check connection limits
  app.get('/accounts/:id/limits', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;

    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });

    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    return {
      connectionsSent: account.connectionsSentToday,
      connectionsLimit: account.dailyConnectionLimit,
      connectionsRemaining: account.dailyConnectionLimit - account.connectionsSentToday,
      messagesSent: account.messagesSentToday,
      messagesLimit: account.dailyMessageLimit,
      messagesRemaining: account.dailyMessageLimit - account.messagesSentToday,
    };
  });

  // Get account stats
  app.get('/accounts/:id/stats', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { period = '7d' } = request.query as { period?: string };

    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });

    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    // TODO: Implement linkedinActions table
    const actions: any[] = [];
    
    // Aggregate stats
    const stats = {
      connectionsSent: 0,
      connectionsAccepted: 0,
      messagesSent: 0,
      messagesReplied: 0,
      profilesVisited: 0,
    };

    return { stats, account };
  });
};

export default linkedinRoutes;
