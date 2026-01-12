import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { aiService } from '../../services/ai/index.js';
import { db } from '../../db/index.js';
import { contacts, campaigns, campaignSteps, organizations } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

const generateEmailSchema = z.object({
  contactId: z.string().optional(),
  campaignId: z.string().optional(),
  context: z.object({
    recipientName: z.string().optional(),
    recipientCompany: z.string().optional(),
    recipientTitle: z.string().optional(),
    recipientIndustry: z.string().optional(),
    senderName: z.string(),
    senderCompany: z.string(),
    senderTitle: z.string().optional(),
    product: z.string().optional(),
    valueProposition: z.string().optional(),
    cta: z.string().optional(),
    previousEmails: z.array(z.object({
      subject: z.string(),
      body: z.string(),
      direction: z.enum(['inbound', 'outbound']),
    })).optional(),
  }),
  style: z.enum(['formal', 'casual', 'friendly', 'professional']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  language: z.enum(['ru', 'en']).default('ru'),
  type: z.enum(['cold', 'follow-up', 'reply', 'breakup']).default('cold'),
});

const generateLinkedinSchema = z.object({
  contactId: z.string().optional(),
  context: z.object({
    recipientName: z.string(),
    recipientCompany: z.string().optional(),
    recipientTitle: z.string().optional(),
    recipientHeadline: z.string().optional(),
    senderName: z.string(),
    senderCompany: z.string(),
    commonConnections: z.number().optional(),
    mutualInterests: z.array(z.string()).optional(),
  }),
  type: z.enum(['connection-note', 'message', 'inmail']).default('message'),
  language: z.enum(['ru', 'en']).default('ru'),
});

const analyzeReplySchema = z.object({
  messageId: z.string().optional(),
  content: z.string(),
  context: z.object({
    previousMessages: z.array(z.object({
      content: z.string(),
      direction: z.enum(['inbound', 'outbound']),
    })).optional(),
    campaignGoal: z.string().optional(),
  }).optional(),
});

const improveTextSchema = z.object({
  text: z.string(),
  type: z.enum(['email-subject', 'email-body', 'linkedin-message', 'linkedin-note']),
  goal: z.string().optional(),
  language: z.enum(['ru', 'en']).default('ru'),
});

const aiRoutes: FastifyPluginAsync = async (app) => {
  // Generate email content
  app.post('/generate/email', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = generateEmailSchema.parse(request.body);

    // Get organization settings for AI
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    // Enrich context with contact data if provided
    let context = { ...data.context };
    if (data.contactId) {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, data.contactId),
          eq(contacts.organizationId, organizationId)
        ),
      });

      if (contact) {
        context = {
          ...context,
          recipientName: contact.firstName || context.recipientName,
          recipientCompany: contact.company || context.recipientCompany,
          recipientTitle: contact.jobTitle || context.recipientTitle,
        };
      }
    }

    const result = await aiService.generateEmail({
      ...data,
      context,
      organizationContext: {
        industry: org?.industry,
        defaultTone: org?.settings?.defaultTone,
      },
    });

    return result;
  });

  // Generate multiple email variants
  app.post('/generate/email/variants', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { count = 3, ...data } = z.object({
      count: z.number().min(1).max(5).default(3),
    }).merge(generateEmailSchema).parse(request.body);

    const variants = await Promise.all(
      Array.from({ length: count }, () =>
        aiService.generateEmail({
          ...data,
          temperature: 0.9, // Higher temperature for more variety
        })
      )
    );

    return { variants };
  });

  // Generate LinkedIn message
  app.post('/generate/linkedin', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = generateLinkedinSchema.parse(request.body);

    const result = await aiService.generateLinkedinMessage(data);

    return result;
  });

  // Generate connection note (max 300 chars)
  app.post('/generate/linkedin/connection-note', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = z.object({
      contactId: z.string().optional(),
      recipientName: z.string(),
      recipientTitle: z.string().optional(),
      recipientCompany: z.string().optional(),
      senderName: z.string(),
      senderCompany: z.string(),
      reason: z.string().optional(),
      language: z.enum(['ru', 'en']).default('ru'),
    }).parse(request.body);

    const result = await aiService.generateConnectionNote(data);

    return result;
  });

  // Analyze reply sentiment and intent
  app.post('/analyze/reply', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = analyzeReplySchema.parse(request.body);

    const analysis = await aiService.analyzeReply(data);

    return analysis;
  });

  // Suggest reply to a message
  app.post('/suggest/reply', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = z.object({
      incomingMessage: z.string(),
      context: z.object({
        previousMessages: z.array(z.object({
          content: z.string(),
          direction: z.enum(['inbound', 'outbound']),
        })).optional(),
        senderName: z.string(),
        senderCompany: z.string(),
        recipientName: z.string().optional(),
        campaignGoal: z.string().optional(),
        product: z.string().optional(),
      }),
      tone: z.enum(['formal', 'casual', 'friendly']).default('friendly'),
      language: z.enum(['ru', 'en']).default('ru'),
    }).parse(request.body);

    const suggestions = await aiService.suggestReply(data);

    return suggestions;
  });

  // Improve/rewrite text
  app.post('/improve', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = improveTextSchema.parse(request.body);

    const result = await aiService.improveText(data);

    return result;
  });

  // Generate subject line variants
  app.post('/generate/subjects', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = z.object({
      emailBody: z.string(),
      context: z.object({
        recipientName: z.string().optional(),
        recipientCompany: z.string().optional(),
        senderCompany: z.string(),
        product: z.string().optional(),
      }),
      count: z.number().min(1).max(10).default(5),
      style: z.enum(['curiosity', 'benefit', 'question', 'personalized', 'urgent']).optional(),
      language: z.enum(['ru', 'en']).default('ru'),
    }).parse(request.body);

    const subjects = await aiService.generateSubjectLines(data);

    return { subjects };
  });

  // Score email content
  app.post('/score/email', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = z.object({
      subject: z.string(),
      body: z.string(),
      type: z.enum(['cold', 'follow-up', 'reply']).default('cold'),
    }).parse(request.body);

    const score = await aiService.scoreEmail(data);

    return score;
  });

  // Generate campaign sequence
  app.post('/generate/sequence', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = z.object({
      campaignId: z.string().optional(),
      context: z.object({
        targetAudience: z.string(),
        product: z.string(),
        valueProposition: z.string(),
        senderName: z.string(),
        senderCompany: z.string(),
        senderTitle: z.string().optional(),
        goal: z.enum(['meeting', 'demo', 'trial', 'purchase', 'awareness']),
        industry: z.string().optional(),
      }),
      steps: z.number().min(2).max(10).default(5),
      channels: z.array(z.enum(['email', 'linkedin'])).default(['email']),
      language: z.enum(['ru', 'en']).default('ru'),
    }).parse(request.body);

    const sequence = await aiService.generateSequence(data);

    // If campaignId provided, save steps
    if (data.campaignId) {
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, data.campaignId),
          eq(campaigns.organizationId, organizationId)
        ),
      });

      if (campaign) {
        // Delete existing steps
        await db.delete(campaignSteps)
          .where(eq(campaignSteps.campaignId, data.campaignId));

        // Insert new steps
        for (let i = 0; i < sequence.steps.length; i++) {
          const step = sequence.steps[i];
          await db.insert(campaignSteps).values({
            campaignId: data.campaignId,
            stepOrder: i + 1,
            stepType: step.channel,
            delayDays: step.delayDays,
            delayHours: step.delayHours || 0,
            subject: step.subject,
            bodyHtml: step.bodyHtml,
            bodyText: step.bodyText,
            linkedinMessage: step.linkedinMessage,
          });
        }
      }
    }

    return sequence;
  });

  // Personalize template for contact
  app.post('/personalize', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = z.object({
      template: z.string(),
      contactId: z.string(),
      additionalContext: z.record(z.string()).optional(),
    }).parse(request.body);

    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, data.contactId),
        eq(contacts.organizationId, organizationId)
      ),
    });

    if (!contact) {
      throw { statusCode: 404, message: 'Contact not found' };
    }

    const personalized = await aiService.personalizeTemplate({
      template: data.template,
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        jobTitle: contact.jobTitle,
        industry: contact.industry,
        linkedinHeadline: contact.linkedinHeadline,
        linkedinSummary: contact.linkedinSummary,
        ...data.additionalContext,
      },
    });

    return personalized;
  });

  // Extract company/contact info from website
  app.post('/extract/website', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = z.object({
      url: z.string().url(),
    }).parse(request.body);

    const info = await aiService.extractFromWebsite(data.url);

    return info;
  });

  // Research company
  app.post('/research/company', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const data = z.object({
      companyName: z.string(),
      domain: z.string().optional(),
      linkedinUrl: z.string().optional(),
    }).parse(request.body);

    const research = await aiService.researchCompany(data);

    return research;
  });
};

export default aiRoutes;
