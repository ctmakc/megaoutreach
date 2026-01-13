import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { campaigns, messages, contacts } from '../../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // Get campaign analytics
  app.get('/campaigns/:id', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;

    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ),
    });

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    // Get message stats
    const messageStats = await db
      .select({
        total: sql<number>`count(*)`,
        sent: sql<number>`count(*) filter (where status = 'sent')`,
        delivered: sql<number>`count(*) filter (where status = 'delivered')`,
        opened: sql<number>`count(*) filter (where status = 'opened')`,
        clicked: sql<number>`count(*) filter (where status = 'clicked')`,
        replied: sql<number>`count(*) filter (where status = 'replied')`,
        bounced: sql<number>`count(*) filter (where status = 'bounced')`,
      })
      .from(messages)
      .where(eq(messages.campaignId, id));

    return {
      campaign,
      stats: messageStats[0] || {},
      openRate: messageStats[0]?.sent > 0
        ? (messageStats[0].opened / messageStats[0].sent * 100).toFixed(2)
        : 0,
      clickRate: messageStats[0]?.sent > 0
        ? (messageStats[0].clicked / messageStats[0].sent * 100).toFixed(2)
        : 0,
      replyRate: messageStats[0]?.sent > 0
        ? (messageStats[0].replied / messageStats[0].sent * 100).toFixed(2)
        : 0,
    };
  });

  // Get dashboard analytics
  app.get('/dashboard', {
    preHandler: [authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;

    // Get overview stats
    const [campaignCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.organizationId, organizationId));

    const [contactCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(eq(contacts.organizationId, organizationId));

    const [messageCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.organizationId, organizationId));

    return {
      campaigns: campaignCount?.count || 0,
      contacts: contactCount?.count || 0,
      messagesSent: messageCount?.count || 0,
    };
  });

  // Get email performance metrics
  app.get('/email-performance', {
    preHandler: [authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { days = 30 } = request.query as { days?: number };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db
      .select({
        date: sql<string>`date(${messages.sentAt})`,
        sent: sql<number>`count(*)`,
        opened: sql<number>`count(*) filter (where status = 'opened' or status = 'clicked' or status = 'replied')`,
        clicked: sql<number>`count(*) filter (where status = 'clicked' or status = 'replied')`,
        replied: sql<number>`count(*) filter (where status = 'replied')`,
      })
      .from(messages)
      .where(and(
        eq(messages.organizationId, organizationId),
        gte(messages.sentAt, startDate)
      ))
      .groupBy(sql`date(${messages.sentAt})`)
      .orderBy(sql`date(${messages.sentAt})`);

    return { stats };
  });

  // Get LinkedIn performance metrics
  app.get('/linkedin-performance', {
    preHandler: [authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { days = 30 } = request.query as { days?: number };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // TODO: Implement linkedinActions table
    const stats: any[] = [];

    return { stats };
  });
};

export default analyticsRoutes;
