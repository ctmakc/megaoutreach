import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { messages, contacts, emailAccounts } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';

const webhooksRoutes: FastifyPluginAsync = async (app) => {
  // Webhook for email service providers (SendGrid, Mailgun, etc.)
  app.post('/email/bounce', async (request, reply) => {
    try {
      const { messageId, email, bounceType, reason } = request.body as any;

      logger.info({ messageId, email, bounceType }, 'Received bounce webhook');

      // Find message by Message-ID
      const message = await db.query.messages.findFirst({
        where: eq(messages.messageId, messageId),
      });

      if (message) {
        // Update message status
        await db.update(messages)
          .set({
            status: 'bounced',
            bouncedAt: new Date(),
            errorMessage: reason,
          })
          .where(eq(messages.id, message.id));

        // Update contact status if hard bounce
        if (message.contactId && bounceType === 'hard') {
          await db.update(contacts)
            .set({
              status: 'bounced',
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, message.contactId));
        }
      }

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'Error processing bounce webhook');
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Webhook for email complaints/spam reports
  app.post('/email/complaint', async (request, reply) => {
    try {
      const { messageId, email, complaintType } = request.body as any;

      logger.warn({ messageId, email, complaintType }, 'Received complaint webhook');

      // Find message
      const message = await db.query.messages.findFirst({
        where: eq(messages.messageId, messageId),
      });

      if (message) {
        // Mark contact as complained
        if (message.contactId) {
          await db.update(contacts)
            .set({
              status: 'complained',
              isUnsubscribed: true,
              unsubscribedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, message.contactId));
        }
      }

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'Error processing complaint webhook');
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Webhook for email delivery status
  app.post('/email/delivery', async (request, reply) => {
    try {
      const { messageId, status, timestamp } = request.body as any;

      logger.info({ messageId, status }, 'Received delivery webhook');

      const message = await db.query.messages.findFirst({
        where: eq(messages.messageId, messageId),
      });

      if (message && status === 'delivered') {
        await db.update(messages)
          .set({
            status: 'delivered',
            deliveredAt: new Date(timestamp),
          })
          .where(eq(messages.id, message.id));
      }

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'Error processing delivery webhook');
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Generic webhook endpoint for custom integrations
  app.post('/custom/:accountId', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };
      const payload = request.body;

      logger.info({ accountId, payload }, 'Received custom webhook');

      // Process custom webhook logic here
      // This can be extended based on specific integration needs

      return { success: true, received: true };
    } catch (error) {
      logger.error({ error }, 'Error processing custom webhook');
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Health check endpoint for webhook services
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};

export default webhooksRoutes;
