import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { linkedinAccounts, linkedinActions, contacts, messages } from '../../db/schema.js';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { addLinkedinJob } from '../../queue/jobs.js';
import { linkedinService } from '../../services/linkedin/client.js';

const linkedinAccountSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  proxyUrl: z.string().optional(),
  dailyConnectionLimit: z.number().default(20),
  dailyMessageLimit: z.number().default(50),
});

const linkedinRoutes: FastifyPluginAsync = async (app) => {
  // List LinkedIn accounts
  app.get('/accounts', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    
    const accounts = await db.query.linkedinAccounts.findMany({
      where: eq(linkedinAccounts.organizationId, organizationId),
      orderBy: [desc(linkedinAccounts.createdAt)],
      columns: {
        password: false,
        sessionCookie: false,
      },
    });
    
    return accounts;
  });

  // Get single LinkedIn account
  app.get('/accounts/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
      columns: {
        password: false,
        sessionCookie: false,
      },
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'LinkedIn account not found' };
    }
    
    // Get recent actions
    const recentActions = await db.query.linkedinActions.findMany({
      where: eq(linkedinActions.linkedinAccountId, id),
      orderBy: [desc(linkedinActions.createdAt)],
      limit: 20,
    });
    
    return { ...account, recentActions };
  });

  // Add LinkedIn account
  app.post('/accounts', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = linkedinAccountSchema.parse(request.body);
    
    // Encrypt password
    const encryptedPassword = encrypt(data.password);
    
    const [account] = await db.insert(linkedinAccounts).values({
      ...data,
      password: encryptedPassword,
      organizationId,
      status: 'pending_login',
    }).returning({
      id: linkedinAccounts.id,
      email: linkedinAccounts.email,
      status: linkedinAccounts.status,
    });
    
    return {
      ...account,
      message: 'Account added. Login required to activate.',
    };
  });

  // Login to LinkedIn account
  app.post('/accounts/:id/login', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { verificationCode } = request.body as { verificationCode?: string };
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }
    
    try {
      const result = await linkedinService.login(
        id,
        account.email,
        decrypt(account.password),
        account.proxyUrl || undefined,
        verificationCode
      );
      
      if (result.requiresVerification) {
        await db.update(linkedinAccounts)
          .set({ status: 'verification_required' })
          .where(eq(linkedinAccounts.id, id));
        
        return {
          success: false,
          requiresVerification: true,
          message: 'Verification code required. Check your email.',
        };
      }
      
      if (result.success) {
        await db.update(linkedinAccounts)
          .set({
            status: 'active',
            sessionCookie: result.sessionCookie ? encrypt(result.sessionCookie) : null,
            profileUrl: result.profileUrl,
            profileName: result.profileName,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(linkedinAccounts.id, id));
        
        return {
          success: true,
          message: 'Successfully logged in',
          profileUrl: result.profileUrl,
          profileName: result.profileName,
        };
      }
      
      throw new Error(result.error || 'Login failed');
      
    } catch (error: any) {
      await db.update(linkedinAccounts)
        .set({
          status: 'error',
          lastError: error.message,
          updatedAt: new Date(),
        })
        .where(eq(linkedinAccounts.id, id));
      
      throw { statusCode: 400, message: error.message };
    }
  });

  // Update LinkedIn account
  app.patch('/accounts/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const data = linkedinAccountSchema.partial().parse(request.body);
    
    const updateData: any = { ...data, updatedAt: new Date() };
    
    if (data.password) {
      updateData.password = encrypt(data.password);
    }
    
    const [updated] = await db.update(linkedinAccounts)
      .set(updateData)
      .where(and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      throw { statusCode: 404, message: 'Account not found' };
    }
    
    return { success: true };
  });

  // Delete LinkedIn account
  app.delete('/accounts/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    // Close browser session if exists
    await linkedinService.closeBrowser(id);
    
    await db.delete(linkedinAccounts)
      .where(and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ));
    
    return { success: true };
  });

  // Send connection request
  app.post('/accounts/:id/connect', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { profileUrl, note, contactId } = z.object({
      profileUrl: z.string().url(),
      note: z.string().max(300).optional(),
      contactId: z.string().optional(),
    }).parse(request.body);
    
    // Verify account ownership
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }
    
    if (account.status !== 'active') {
      throw { statusCode: 400, message: 'Account is not active' };
    }
    
    // Check daily limit
    if (account.connectionsToday >= account.dailyConnectionLimit) {
      throw { statusCode: 429, message: 'Daily connection limit reached' };
    }
    
    // Add job to queue (for delayed/scheduled execution)
    await addLinkedinJob({
      accountId: id,
      action: 'connect',
      targetUrl: profileUrl,
      note,
      contactId,
    });
    
    return {
      success: true,
      message: 'Connection request queued',
    };
  });

  // Send message
  app.post('/accounts/:id/message', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { profileUrl, message, contactId, campaignId } = z.object({
      profileUrl: z.string().url(),
      message: z.string().min(1).max(5000),
      contactId: z.string().optional(),
      campaignId: z.string().optional(),
    }).parse(request.body);
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }
    
    if (account.status !== 'active') {
      throw { statusCode: 400, message: 'Account is not active' };
    }
    
    if (account.messagesToday >= account.dailyMessageLimit) {
      throw { statusCode: 429, message: 'Daily message limit reached' };
    }
    
    await addLinkedinJob({
      accountId: id,
      action: 'message',
      targetUrl: profileUrl,
      message,
      contactId,
      campaignId,
    });
    
    return {
      success: true,
      message: 'Message queued',
    };
  });

  // Visit profile
  app.post('/accounts/:id/visit', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { profileUrl, contactId } = z.object({
      profileUrl: z.string().url(),
      contactId: z.string().optional(),
    }).parse(request.body);
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account || account.status !== 'active') {
      throw { statusCode: 400, message: 'Account not active' };
    }
    
    await addLinkedinJob({
      accountId: id,
      action: 'visit',
      targetUrl: profileUrl,
      contactId,
    });
    
    return { success: true };
  });

  // Get account statistics
  app.get('/accounts/:id/stats', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { period = '7d' } = request.query as any;
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
      columns: {
        id: true,
        email: true,
        connectionsToday: true,
        messagesToday: true,
        dailyConnectionLimit: true,
        dailyMessageLimit: true,
      },
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }
    
    // Get actions for period
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const actions = await db.query.linkedinActions.findMany({
      where: and(
        eq(linkedinActions.linkedinAccountId, id),
        gte(linkedinActions.createdAt, startDate)
      ),
    });
    
    // Aggregate stats
    const stats = actions.reduce((acc, action) => {
      if (action.actionType === 'connect') {
        acc.connectionsSent++;
        if (action.status === 'completed') acc.connectionsAccepted++;
      } else if (action.actionType === 'message') {
        acc.messagesSent++;
        if (action.status === 'replied') acc.messagesReplied++;
      } else if (action.actionType === 'visit') {
        acc.profilesVisited++;
      }
      return acc;
    }, {
      connectionsSent: 0,
      connectionsAccepted: 0,
      messagesSent: 0,
      messagesReplied: 0,
      profilesVisited: 0,
    });
    
    return {
      account,
      period,
      stats,
      actions: actions.slice(0, 50), // Last 50 actions
    };
  });

  // Sync inbox (check for replies)
  app.post('/accounts/:id/sync-inbox', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, id),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account || account.status !== 'active') {
      throw { statusCode: 400, message: 'Account not active' };
    }
    
    const result = await linkedinService.syncInbox(id);
    
    return result;
  });

  // Search profiles
  app.post('/search', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { accountId, query, filters, page = 1 } = z.object({
      accountId: z.string(),
      query: z.string().optional(),
      filters: z.object({
        keywords: z.string().optional(),
        locations: z.array(z.string()).optional(),
        industries: z.array(z.string()).optional(),
        companies: z.array(z.string()).optional(),
        titles: z.array(z.string()).optional(),
        connectionDegree: z.enum(['1st', '2nd', '3rd']).optional(),
      }).optional(),
      page: z.number().default(1),
    }).parse(request.body);
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, accountId),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account || account.status !== 'active') {
      throw { statusCode: 400, message: 'Account not active' };
    }
    
    const results = await linkedinService.searchProfiles(accountId, query, filters, page);
    
    return results;
  });

  // Import profile as contact
  app.post('/import-profile', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { accountId, profileUrl } = z.object({
      accountId: z.string(),
      profileUrl: z.string().url(),
    }).parse(request.body);
    
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(
        eq(linkedinAccounts.id, accountId),
        eq(linkedinAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account || account.status !== 'active') {
      throw { statusCode: 400, message: 'Account not active' };
    }
    
    // Scrape profile
    const profileData = await linkedinService.scrapeProfile(accountId, profileUrl);
    
    // Create or update contact
    const existing = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.organizationId, organizationId),
        eq(contacts.linkedinUrl, profileUrl)
      ),
    });
    
    if (existing) {
      await db.update(contacts)
        .set({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          company: profileData.company,
          jobTitle: profileData.jobTitle,
          location: profileData.location,
          linkedinHeadline: profileData.headline,
          linkedinSummary: profileData.summary,
          linkedinConnections: profileData.connections,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existing.id));
      
      return { contact: existing, updated: true };
    }
    
    const [newContact] = await db.insert(contacts).values({
      organizationId,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      company: profileData.company,
      jobTitle: profileData.jobTitle,
      location: profileData.location,
      linkedinUrl: profileUrl,
      linkedinHeadline: profileData.headline,
      linkedinSummary: profileData.summary,
      linkedinConnections: profileData.connections,
      source: 'linkedin',
    }).returning();
    
    return { contact: newContact, created: true };
  });
};

export default linkedinRoutes;