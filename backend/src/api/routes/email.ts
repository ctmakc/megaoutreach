import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { emailAccounts, emailWarmupLogs } from '../../db/schema.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import { z } from 'zod';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { testSmtpConnection, testImapConnection } from '../../services/email/smtp.js';
import { addWarmupJob } from '../../queue/jobs.js';

const emailAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  smtpHost: z.string(),
  smtpPort: z.number().default(587),
  smtpUser: z.string(),
  smtpPassword: z.string(),
  smtpSecure: z.boolean().default(false),
  imapHost: z.string().optional(),
  imapPort: z.number().default(993),
  imapUser: z.string().optional(),
  imapPassword: z.string().optional(),
  dailyLimit: z.number().default(50),
});

const emailRoutes: FastifyPluginAsync = async (app) => {
  // List email accounts
  app.get('/accounts', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.organizationId, organizationId),
      orderBy: [desc(emailAccounts.createdAt)],
      columns: {
        smtpPassword: false,
        imapPassword: false,
      },
    });
    
    return accounts;
  });

  // Get single email account
  app.get('/accounts/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, id),
        eq(emailAccounts.organizationId, organizationId)
      ),
      columns: {
        smtpPassword: false,
        imapPassword: false,
      },
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Email account not found' };
    }
    
    return account;
  });

  // Add email account
  app.post('/accounts', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = emailAccountSchema.parse(request.body);
    
    // Test SMTP connection
    const smtpTest = await testSmtpConnection({
      host: data.smtpHost,
      port: data.smtpPort,
      user: data.smtpUser,
      password: data.smtpPassword,
      secure: data.smtpSecure,
    });
    
    if (!smtpTest.success) {
      throw { statusCode: 400, message: `SMTP connection failed: ${smtpTest.error}` };
    }
    
    // Test IMAP if provided
    if (data.imapHost && data.imapUser && data.imapPassword) {
      const imapTest = await testImapConnection({
        host: data.imapHost,
        port: data.imapPort!,
        user: data.imapUser,
        password: data.imapPassword,
      });
      
      if (!imapTest.success) {
        throw { statusCode: 400, message: `IMAP connection failed: ${imapTest.error}` };
      }
    }
    
    // Encrypt passwords
    const encryptedSmtpPassword = encrypt(data.smtpPassword);
    const encryptedImapPassword = data.imapPassword ? encrypt(data.imapPassword) : null;
    
    const [account] = await db.insert(emailAccounts).values({
      ...data,
      smtpPassword: encryptedSmtpPassword,
      imapPassword: encryptedImapPassword,
      organizationId,
      status: 'warming',
      warmupStartDate: new Date(),
      warmupDay: 0,
      dailyLimit: 5, // Start low during warmup
    }).returning();
    
    // Start warmup process
    await addWarmupJob(account.id);
    
    return {
      id: account.id,
      email: account.email,
      status: account.status,
      message: 'Email account added. Warmup process started.',
    };
  });

  // Update email account
  app.patch('/accounts/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const data = emailAccountSchema.partial().parse(request.body);
    
    const updateData: any = { ...data, updatedAt: new Date() };
    
    // Re-encrypt passwords if changed
    if (data.smtpPassword) {
      updateData.smtpPassword = encrypt(data.smtpPassword);
    }
    if (data.imapPassword) {
      updateData.imapPassword = encrypt(data.imapPassword);
    }
    
    const [updated] = await db.update(emailAccounts)
      .set(updateData)
      .where(and(
        eq(emailAccounts.id, id),
        eq(emailAccounts.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      throw { statusCode: 404, message: 'Email account not found' };
    }
    
    return { success: true };
  });

  // Delete email account
  app.delete('/accounts/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    await db.delete(emailAccounts)
      .where(and(
        eq(emailAccounts.id, id),
        eq(emailAccounts.organizationId, organizationId)
      ));
    
    return { success: true };
  });

  // Test email account connection
  app.post('/accounts/:id/test', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, id),
        eq(emailAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Email account not found' };
    }
    
    const smtpTest = await testSmtpConnection({
      host: account.smtpHost,
      port: account.smtpPort,
      user: account.smtpUser,
      password: decrypt(account.smtpPassword),
      secure: account.smtpSecure || false,
    });
    
    let imapTest = { success: true, error: null };
    if (account.imapHost && account.imapUser && account.imapPassword) {
      imapTest = await testImapConnection({
        host: account.imapHost,
        port: account.imapPort!,
        user: account.imapUser,
        password: decrypt(account.imapPassword),
      });
    }
    
    return {
      smtp: smtpTest,
      imap: imapTest,
    };
  });

  // Get warmup status
  app.get('/accounts/:id/warmup', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, id),
        eq(emailAccounts.organizationId, organizationId)
      ),
      columns: {
        id: true,
        email: true,
        status: true,
        warmupStartDate: true,
        warmupDay: true,
        dailyLimit: true,
        deliveryRate: true,
        bounceRate: true,
        replyRate: true,
      },
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Email account not found' };
    }
    
    // Get warmup logs for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const logs = await db.query.emailWarmupLogs.findMany({
      where: and(
        eq(emailWarmupLogs.emailAccountId, id),
        gte(emailWarmupLogs.date, thirtyDaysAgo)
      ),
      orderBy: [desc(emailWarmupLogs.date)],
    });
    
    return {
      account,
      logs,
      progress: calculateWarmupProgress(account),
    };
  });

  // Send test email
  app.post('/accounts/:id/send-test', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { to, subject, body } = z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }).parse(request.body);
    
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, id),
        eq(emailAccounts.organizationId, organizationId)
      ),
    });
    
    if (!account) {
      throw { statusCode: 404, message: 'Email account not found' };
    }
    
    const { sendEmail } = await import('../../services/email/sender.js');
    
    const result = await sendEmail({
      accountId: id,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''),
    });
    
    return result;
  });

  // Get email sending stats
  app.get('/stats', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { period = '7d' } = request.query as any;
    
    // Calculate date range
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get all accounts
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.organizationId, organizationId),
      columns: {
        id: true,
        email: true,
        status: true,
        sentToday: true,
        dailyLimit: true,
        deliveryRate: true,
        bounceRate: true,
        replyRate: true,
      },
    });
    
    // Aggregate stats
    const totals = accounts.reduce((acc, a) => ({
      totalAccounts: acc.totalAccounts + 1,
      activeAccounts: acc.activeAccounts + (a.status === 'ready' ? 1 : 0),
      warmingAccounts: acc.warmingAccounts + (a.status === 'warming' ? 1 : 0),
      sentToday: acc.sentToday + (a.sentToday || 0),
      dailyCapacity: acc.dailyCapacity + (a.dailyLimit || 0),
      avgDeliveryRate: acc.avgDeliveryRate + (a.deliveryRate || 100),
      avgBounceRate: acc.avgBounceRate + (a.bounceRate || 0),
      avgReplyRate: acc.avgReplyRate + (a.replyRate || 0),
    }), {
      totalAccounts: 0,
      activeAccounts: 0,
      warmingAccounts: 0,
      sentToday: 0,
      dailyCapacity: 0,
      avgDeliveryRate: 0,
      avgBounceRate: 0,
      avgReplyRate: 0,
    });
    
    const count = accounts.length || 1;
    
    return {
      ...totals,
      avgDeliveryRate: Math.round(totals.avgDeliveryRate / count),
      avgBounceRate: Math.round(totals.avgBounceRate / count),
      avgReplyRate: Math.round(totals.avgReplyRate / count),
      accounts,
    };
  });
};

function calculateWarmupProgress(account: any): {
  phase: string;
  progress: number;
  daysRemaining: number;
  currentLimit: number;
  targetLimit: number;
} {
  const warmupDay = account.warmupDay || 0;
  const targetLimit = 100; // Target daily limit after warmup
  
  // Warmup phases (typically 4-6 weeks)
  // Week 1: 5-10 emails/day
  // Week 2: 10-20 emails/day
  // Week 3: 20-40 emails/day
  // Week 4: 40-70 emails/day
  // Week 5+: 70-100 emails/day
  
  let phase: string;
  let progress: number;
  
  if (warmupDay < 7) {
    phase = 'Initial';
    progress = (warmupDay / 7) * 20;
  } else if (warmupDay < 14) {
    phase = 'Building';
    progress = 20 + ((warmupDay - 7) / 7) * 20;
  } else if (warmupDay < 21) {
    phase = 'Growing';
    progress = 40 + ((warmupDay - 14) / 7) * 20;
  } else if (warmupDay < 28) {
    phase = 'Scaling';
    progress = 60 + ((warmupDay - 21) / 7) * 20;
  } else if (warmupDay < 35) {
    phase = 'Maturing';
    progress = 80 + ((warmupDay - 28) / 7) * 20;
  } else {
    phase = 'Ready';
    progress = 100;
  }
  
  return {
    phase,
    progress: Math.min(100, Math.round(progress)),
    daysRemaining: Math.max(0, 35 - warmupDay),
    currentLimit: account.dailyLimit || 5,
    targetLimit,
  };
}

export default emailRoutes;