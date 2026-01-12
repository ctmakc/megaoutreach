import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { messages, contacts, campaigns, campaignContacts, campaignSteps } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const trackingRoutes: FastifyPluginAsync = async (app) => {
  // Open tracking (pixel)
  app.get('/o/:trackingId', async (request, reply) => {
    const { trackingId } = request.params as { trackingId: string };

    try {
      // Find message by tracking ID
      const message = await db.query.messages.findFirst({
        where: eq(messages.trackingId, trackingId),
      });

      if (message && !message.openedAt) {
        // Update message
        await db.update(messages)
          .set({
            status: 'opened',
            openedAt: new Date(),
            opensCount: sql`${messages.opensCount} + 1`,
          })
          .where(eq(messages.id, message.id));

        // Update contact
        if (message.contactId) {
          await db.update(contacts)
            .set({
              totalEmailsOpened: sql`${contacts.totalEmailsOpened} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, message.contactId));
        }

        // Update campaign stats
        if (message.campaignId) {
          await db.update(campaigns)
            .set({
              opened: sql`${campaigns.opened} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(campaigns.id, message.campaignId));
        }

        // Update step stats
        if (message.stepId) {
          await db.update(campaignSteps)
            .set({
              opened: sql`${campaignSteps.opened} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(campaignSteps.id, message.stepId));
        }

        logger.info({ trackingId, messageId: message.id }, 'Email opened');
      } else if (message) {
        // Just increment opens count
        await db.update(messages)
          .set({ opensCount: sql`${messages.opensCount} + 1` })
          .where(eq(messages.id, message.id));
      }
    } catch (error) {
      logger.error({ error, trackingId }, 'Error tracking email open');
    }

    // Always return the tracking pixel
    reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .send(TRACKING_PIXEL);
  });

  // Click tracking
  app.get('/c/:trackingId', async (request, reply) => {
    const { trackingId } = request.params as { trackingId: string };
    const { url } = request.query as { url?: string };

    if (!url) {
      return reply.status(400).send('Missing URL');
    }

    const decodedUrl = decodeURIComponent(url);

    try {
      // Find message by tracking ID
      const message = await db.query.messages.findFirst({
        where: eq(messages.trackingId, trackingId),
      });

      if (message) {
        // Update message
        const clickedLinks = (message.clickedLinks as string[]) || [];
        if (!clickedLinks.includes(decodedUrl)) {
          clickedLinks.push(decodedUrl);
        }

        await db.update(messages)
          .set({
            status: message.status === 'opened' ? 'clicked' : message.status,
            clickedAt: message.clickedAt || new Date(),
            clicksCount: sql`${messages.clicksCount} + 1`,
            clickedLinks,
          })
          .where(eq(messages.id, message.id));

        // Update campaign stats
        if (message.campaignId && !message.clickedAt) {
          // Only count first click
          await db.update(campaigns)
            .set({ updatedAt: new Date() })
            .where(eq(campaigns.id, message.campaignId));
        }

        // Update step stats
        if (message.stepId && !message.clickedAt) {
          await db.update(campaignSteps)
            .set({
              clicked: sql`${campaignSteps.clicked} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(campaignSteps.id, message.stepId));
        }

        logger.info({ trackingId, url: decodedUrl }, 'Email link clicked');
      }
    } catch (error) {
      logger.error({ error, trackingId }, 'Error tracking click');
    }

    // Redirect to actual URL
    reply.redirect(302, decodedUrl);
  });

  // Unsubscribe
  app.get('/u/:trackingId', async (request, reply) => {
    const { trackingId } = request.params as { trackingId: string };

    try {
      // Find message
      const message = await db.query.messages.findFirst({
        where: eq(messages.trackingId, trackingId),
      });

      if (message && message.contactId) {
        // Mark contact as unsubscribed
        await db.update(contacts)
          .set({
            isUnsubscribed: true,
            unsubscribedAt: new Date(),
            status: 'unsubscribed',
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, message.contactId));

        // Deactivate from all campaigns
        await db.update(campaignContacts)
          .set({ isActive: false })
          .where(eq(campaignContacts.contactId, message.contactId));

        logger.info({ trackingId, contactId: message.contactId }, 'Contact unsubscribed');
      }
    } catch (error) {
      logger.error({ error, trackingId }, 'Error processing unsubscribe');
    }

    // Show unsubscribe confirmation page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Отписка</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          h1 { color: #333; margin-bottom: 16px; }
          p { color: #666; margin-bottom: 24px; }
          .icon { font-size: 48px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✓</div>
          <h1>Вы отписаны</h1>
          <p>Вы больше не будете получать письма от нас. Это изменение вступит в силу немедленно.</p>
        </div>
      </body>
      </html>
    `;

    reply.type('text/html').send(html);
  });

  // Webhook for bounces (for email services that support it)
  app.post('/bounce', async (request) => {
    const { messageId, email, reason, type } = request.body as any;

    try {
      // Find message by Message-ID header
      const message = await db.query.messages.findFirst({
        where: eq(messages.messageId, messageId),
      });

      if (message) {
        await db.update(messages)
          .set({
            status: 'bounced',
            bouncedAt: new Date(),
            errorMessage: reason,
          })
          .where(eq(messages.id, message.id));

        // Update contact status
        if (message.contactId) {
          await db.update(contacts)
            .set({
              status: 'bounced',
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, message.contactId));
        }

        logger.info({ messageId, email, reason, type }, 'Email bounced');
      }
    } catch (error) {
      logger.error({ error, messageId }, 'Error processing bounce');
    }

    return { success: true };
  });
};

export default trackingRoutes;
