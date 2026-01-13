import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { campaigns, campaignSteps, campaignContacts, contacts } from '../../db/schema.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';
import { addCampaignContactsJob, addCampaignJob } from '../../queue/jobs.js';

const campaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  channel: z.enum(['email', 'linkedin', 'multi']),
  settings: z.object({
    dailyLimit: z.number().optional(),
    minDelayBetweenEmails: z.number().optional(),
    maxDelayBetweenEmails: z.number().optional(),
    stopOnReply: z.boolean().optional(),
    stopOnMeeting: z.boolean().optional(),
    trackOpens: z.boolean().optional(),
    trackClicks: z.boolean().optional(),
    aiAutoRespond: z.boolean().optional(),
    aiRespondPrompt: z.string().optional(),
  }).optional(),
  scheduleTimezone: z.string().optional(),
  scheduleStartTime: z.string().optional(),
  scheduleEndTime: z.string().optional(),
  scheduleDays: z.array(z.number()).optional(),
});

const stepSchema = z.object({
  stepNumber: z.number(),
  channel: z.enum(['email', 'linkedin', 'multi']),
  delayDays: z.number().default(0),
  delayHours: z.number().default(0),
  subject: z.string().optional(),
  body: z.string().optional(),
  linkedinAction: z.string().optional(),
  linkedinMessage: z.string().optional(),
  linkedinNote: z.string().optional(),
  conditions: z.object({
    onlyIfOpened: z.boolean().optional(),
    onlyIfClicked: z.boolean().optional(),
    onlyIfNotReplied: z.boolean().optional(),
    skipIfLinkedinConnected: z.boolean().optional(),
  }).optional(),
  useAiPersonalization: z.boolean().optional(),
  aiPrompt: z.string().optional(),
});

const campaignRoutes: FastifyPluginAsync = async (app) => {
  // List campaigns
  app.get('/', {
    preHandler: [authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    
    const allCampaigns = await db.query.campaigns.findMany({
      where: eq(campaigns.organizationId, organizationId),
      orderBy: [desc(campaigns.createdAt)],
      with: {
        createdBy: {
          columns: { id: true, name: true, email: true },
        },
      },
    });
    
    return allCampaigns;
  });

  // Get single campaign with steps
  app.get('/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ),
      with: {
        steps: {
          orderBy: (steps, { asc }) => [asc(steps.stepNumber)],
        },
        createdBy: {
          columns: { id: true, name: true, email: true },
        },
      },
    });
    
    if (!campaign) {
      throw { statusCode: 404, message: 'Campaign not found' };
    }
    
    return campaign;
  });

  // Create campaign
  app.post('/', {
    preHandler: [authenticate],
  }, async (request) => {
    const { userId, organizationId } = request.user as any;
    const data = campaignSchema.parse(request.body);
    
    const [campaign] = await db.insert(campaigns).values({
      ...data,
      organizationId,
      createdById: userId,
    }).returning();
    
    return campaign;
  });

  // Update campaign
  app.patch('/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const data = campaignSchema.partial().parse(request.body);
    
    const [updated] = await db.update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      throw { statusCode: 404, message: 'Campaign not found' };
    }
    
    return updated;
  });

  // Delete campaign
  app.delete('/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    await db.delete(campaigns)
      .where(and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ));
    
    return { success: true };
  });

  // Add/update steps
  app.put('/:id/steps', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const steps = z.array(stepSchema).parse(request.body);
    
    // Verify campaign exists and belongs to org
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ),
    });
    
    if (!campaign) {
      throw { statusCode: 404, message: 'Campaign not found' };
    }
    
    // Delete existing steps
    await db.delete(campaignSteps).where(eq(campaignSteps.campaignId, id));
    
    // Insert new steps
    if (steps.length > 0) {
      await db.insert(campaignSteps).values(
        steps.map((step) => ({
          ...step,
          campaignId: id,
        }))
      );
    }
    
    return { success: true, stepsCount: steps.length };
  });

  // Add contacts to campaign
  app.post('/:id/contacts', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { contactIds } = z.object({
      contactIds: z.array(z.string()),
    }).parse(request.body);
    
    // Verify campaign
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ),
    });
    
    if (!campaign) {
      throw { statusCode: 404, message: 'Campaign not found' };
    }
    
    // Add contacts (skip duplicates)
    const existingContacts = await db.query.campaignContacts.findMany({
      where: and(
        eq(campaignContacts.campaignId, id),
        inArray(campaignContacts.contactId, contactIds)
      ),
      columns: { contactId: true },
    });
    
    const existingIds = new Set(existingContacts.map((c) => c.contactId));
    const newContactIds = contactIds.filter((cid) => !existingIds.has(cid));
    
    if (newContactIds.length > 0) {
      await db.insert(campaignContacts).values(
        newContactIds.map((contactId) => ({
          campaignId: id,
          contactId,
        }))
      );
      
      // Update campaign total
      await db.update(campaigns)
        .set({
          totalContacts: sql`${campaigns.totalContacts} + ${newContactIds.length}`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id));
    }
    
    return { added: newContactIds.length, skipped: existingIds.size };
  });

  // Get campaign contacts
  app.get('/:id/contacts', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { page = 1, limit = 50, status } = request.query as any;
    
    // Verify campaign
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ),
    });
    
    if (!campaign) {
      throw { statusCode: 404, message: 'Campaign not found' };
    }
    
    const offset = (page - 1) * limit;
    
    const contactsList = await db.query.campaignContacts.findMany({
      where: and(
        eq(campaignContacts.campaignId, id),
        status ? eq(campaignContacts.status, status) : undefined
      ),
      with: {
        contact: true,
      },
      limit,
      offset,
    });
    
    return contactsList;
  });

  // Start campaign
  app.post('/:id/start', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ),
      with: {
        steps: true,
      },
    });
    
    if (!campaign) {
      throw { statusCode: 404, message: 'Campaign not found' };
    }
    
    if (campaign.steps.length === 0) {
      throw { statusCode: 400, message: 'Campaign has no steps' };
    }
    
    if (campaign.totalContacts === 0) {
      throw { statusCode: 400, message: 'Campaign has no contacts' };
    }
    
    // Update status
    await db.update(campaigns)
      .set({
        status: 'active',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));
    
    // Schedule campaign processing
    await addCampaignJob({ campaignId: id });
    
    return { success: true, message: 'Campaign started' };
  });

  // Pause campaign
  app.post('/:id/pause', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    await db.update(campaigns)
      .set({
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ));
    
    return { success: true };
  });

  // Get campaign stats
  app.get('/:id/stats', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const campaign = await db.query.campaigns.findFirst({
      where: and(
        eq(campaigns.id, id),
        eq(campaigns.organizationId, organizationId)
      ),
      with: {
        steps: {
          columns: {
            id: true,
            stepNumber: true,
            sent: true,
            opened: true,
            clicked: true,
            replied: true,
          },
        },
      },
    });
    
    if (!campaign) {
      throw { statusCode: 404, message: 'Campaign not found' };
    }
    
    // Calculate rates
    const stats = {
      total: campaign.totalContacts,
      contacted: campaign.contacted,
      opened: campaign.opened,
      replied: campaign.replied,
      meetings: campaign.meetings,
      openRate: campaign.contacted > 0 ? Math.round((campaign.opened / campaign.contacted) * 100) : 0,
      replyRate: campaign.contacted > 0 ? Math.round((campaign.replied / campaign.contacted) * 100) : 0,
      meetingRate: campaign.contacted > 0 ? Math.round((campaign.meetings / campaign.contacted) * 100) : 0,
      stepStats: campaign.steps,
    };
    
    return stats;
  });
};

export default campaignRoutes;