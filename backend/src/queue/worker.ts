import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redis } from '../utils/redis.js';
import { logger } from '../utils/logger.js';
import { db } from '../db/index.js';
import { emailAccounts, campaigns, campaignContacts, campaignSteps, contacts } from '../db/schema.js';
import { eq, and, lte, sql, isNull } from 'drizzle-orm';
import { sendEmail, personalizeContent } from '../services/email/sender.js';
import { warmupService } from '../services/email/warmup.js';

// Email worker
const emailWorker = new Worker('email', async (job: Job) => {
  const { name, data } = job;
  
  logger.info({ jobId: job.id, name }, 'Processing email job');
  
  switch (name) {
    case 'send':
      return sendEmail(data);
      
    case 'reset-limits':
      // Reset daily send counts for all accounts
      await db.update(emailAccounts)
        .set({ sentToday: 0, updatedAt: new Date() });
      logger.info('Daily email limits reset');
      return { success: true };
      
    default:
      throw new Error(`Unknown job type: ${name}`);
  }
}, { connection: redis, concurrency: 5 });

// Campaign worker
const campaignWorker = new Worker('campaign', async (job: Job) => {
  const { name, data } = job;
  
  logger.info({ jobId: job.id, name, data }, 'Processing campaign job');
  
  switch (name) {
    case 'process':
      return processCampaign(data.campaignId);
      
    case 'add-contacts':
      return addContactsToCampaign(data.campaignId, data.contactIds);
      
    default:
      throw new Error(`Unknown job type: ${name}`);
  }
}, { connection: redis, concurrency: 2 });

// Warmup worker
const warmupWorker = new Worker('warmup', async (job: Job) => {
  const { data } = job;
  
  logger.info({ jobId: job.id, accountId: data.accountId }, 'Processing warmup job');
  
  await warmupService.runWarmupCycle(data.accountId);
  
  return { success: true };
}, { connection: redis, concurrency: 1 });

// AI worker (placeholder - will be implemented in AI module)
const aiWorker = new Worker('ai', async (job: Job) => {
  const { name, data } = job;
  
  logger.info({ jobId: job.id, name }, 'Processing AI job');
  
  // Placeholder - implement in AI module
  return { success: true };
}, { connection: redis, concurrency: 3 });

// Campaign processing logic
async function processCampaign(campaignId: string): Promise<{ processed: number; errors: number }> {
  const campaign = await db.query.campaigns.findFirst({
    where: and(
      eq(campaigns.id, campaignId),
      eq(campaigns.status, 'active')
    ),
    with: {
      steps: {
        orderBy: (steps, { asc }) => [asc(steps.stepNumber)],
      },
    },
  });
  
  if (!campaign) {
    logger.warn({ campaignId }, 'Campaign not found or not active');
    return { processed: 0, errors: 0 };
  }
  
  if (campaign.steps.length === 0) {
    logger.warn({ campaignId }, 'Campaign has no steps');
    return { processed: 0, errors: 0 };
  }
  
  // Check schedule (business hours)
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const scheduleDays = (campaign.scheduleDays as number[]) || [1, 2, 3, 4, 5];
  
  const [startHour] = (campaign.scheduleStartTime || '09:00').split(':').map(Number);
  const [endHour] = (campaign.scheduleEndTime || '18:00').split(':').map(Number);
  
  if (!scheduleDays.includes(day) || hour < startHour || hour >= endHour) {
    logger.debug({ campaignId, hour, day }, 'Outside campaign schedule');
    return { processed: 0, errors: 0 };
  }
  
  // Get available email accounts
  const emailAccountsList = await db.query.emailAccounts.findMany({
    where: and(
      eq(emailAccounts.organizationId, campaign.organizationId),
      eq(emailAccounts.isActive, true),
      sql`${emailAccounts.sentToday} < ${emailAccounts.dailyLimit}`
    ),
  });
  
  if (emailAccountsList.length === 0) {
    logger.warn({ campaignId }, 'No available email accounts');
    return { processed: 0, errors: 0 };
  }
  
  // Get contacts ready for next action
  const readyContacts = await db.query.campaignContacts.findMany({
    where: and(
      eq(campaignContacts.campaignId, campaignId),
      eq(campaignContacts.isActive, true),
      lte(campaignContacts.nextActionAt, now)
    ),
    with: {
      contact: true,
    },
    limit: 50, // Process in batches
  });
  
  let processed = 0;
  let errors = 0;
  
  for (const cc of readyContacts) {
    try {
      // Determine which step to execute
      const currentStepNumber = cc.currentStep || 0;
      const step = campaign.steps.find(s => s.stepNumber === currentStepNumber + 1);
      
      if (!step) {
        // Campaign completed for this contact
        await db.update(campaignContacts)
          .set({
            isActive: false,
            status: 'contacted',
          })
          .where(eq(campaignContacts.id, cc.id));
        continue;
      }
      
      // Check step conditions
      if (!await checkStepConditions(cc.id, step)) {
        // Skip this step, move to next
        await scheduleNextStep(cc.id, step.stepNumber, campaign.steps);
        continue;
      }
      
      // Select email account (round-robin)
      const accountIndex = processed % emailAccountsList.length;
      const account = emailAccountsList[accountIndex];
      
      // Check if account still has capacity
      if (account.sentToday >= account.dailyLimit) {
        continue;
      }
      
      // Prepare email content
      const contact = cc.contact;
      const variables: Record<string, string> = {
        ...(cc.variables as Record<string, string> || {}),
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        company: contact.company || '',
        jobTitle: contact.jobTitle || '',
        city: contact.city || '',
        industry: contact.industry || '',
        senderName: account.name || account.email.split('@')[0],
        senderEmail: account.email,
      };
      
      const subject = personalizeContent(step.subject || '', variables);
      const body = personalizeContent(step.body || '', variables);
      
      // Send email
      const result = await sendEmail({
        accountId: account.id,
        to: contact.email!,
        subject,
        html: body,
        campaignId,
        campaignContactId: cc.id,
        contactId: contact.id,
        stepId: step.id,
        trackOpens: campaign.settings?.trackOpens !== false,
        trackClicks: campaign.settings?.trackClicks !== false,
      });
      
      if (result.success) {
        // Update step stats
        await db.update(campaignSteps)
          .set({ sent: sql`${campaignSteps.sent} + 1` })
          .where(eq(campaignSteps.id, step.id));
        
        // Schedule next step
        await scheduleNextStep(cc.id, step.stepNumber, campaign.steps);
        
        processed++;
        
        // Update local account count
        account.sentToday++;
      } else {
        errors++;
        
        // Update error count
        await db.update(campaignContacts)
          .set({
            errorCount: sql`${campaignContacts.errorCount} + 1`,
            lastError: result.error,
          })
          .where(eq(campaignContacts.id, cc.id));
      }
      
    } catch (error: any) {
      logger.error({ error, contactId: cc.id }, 'Error processing campaign contact');
      errors++;
    }
  }
  
  logger.info({ campaignId, processed, errors }, 'Campaign processing completed');
  
  return { processed, errors };
}

async function checkStepConditions(campaignContactId: string, step: any): Promise<boolean> {
  const conditions = step.conditions || {};
  
  if (Object.keys(conditions).length === 0) {
    return true;
  }
  
  // Get message history for this contact in campaign
  const messages = await db.query.messages.findMany({
    where: eq(campaignContacts.id, campaignContactId),
  });
  
  if (conditions.onlyIfOpened) {
    const hasOpened = messages.some(m => m.openedAt);
    if (!hasOpened) return false;
  }
  
  if (conditions.onlyIfClicked) {
    const hasClicked = messages.some(m => m.clickedAt);
    if (!hasClicked) return false;
  }
  
  if (conditions.onlyIfNotReplied) {
    const hasReplied = messages.some(m => m.repliedAt);
    if (hasReplied) return false;
  }
  
  return true;
}

async function scheduleNextStep(
  campaignContactId: string,
  currentStepNumber: number,
  allSteps: any[]
): Promise<void> {
  const nextStep = allSteps.find(s => s.stepNumber === currentStepNumber + 1);
  
  if (!nextStep) {
    // No more steps
    await db.update(campaignContacts)
      .set({
        currentStep: currentStepNumber,
        isActive: false,
      })
      .where(eq(campaignContacts.id, campaignContactId));
    return;
  }
  
  // Calculate next action time
  const nextActionAt = new Date();
  nextActionAt.setDate(nextActionAt.getDate() + (nextStep.delayDays || 0));
  nextActionAt.setHours(nextActionAt.getHours() + (nextStep.delayHours || 0));
  
  await db.update(campaignContacts)
    .set({
      currentStep: currentStepNumber,
      nextActionAt,
    })
    .where(eq(campaignContacts.id, campaignContactId));
}

async function addContactsToCampaign(campaignId: string, contactIds: string[]): Promise<void> {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
    with: {
      steps: { orderBy: (s, { asc }) => [asc(s.stepNumber)] },
    },
  });
  
  if (!campaign || campaign.steps.length === 0) return;
  
  const firstStep = campaign.steps[0];
  
  // Calculate initial next action time (start immediately or with delay)
  const nextActionAt = new Date();
  nextActionAt.setDate(nextActionAt.getDate() + (firstStep.delayDays || 0));
  nextActionAt.setHours(nextActionAt.getHours() + (firstStep.delayHours || 0));
  
  // Insert contacts
  await db.insert(campaignContacts)
    .values(contactIds.map(contactId => ({
      campaignId,
      contactId,
      currentStep: 0,
      nextActionAt,
    })))
    .onConflictDoNothing();
}

// Error handlers
emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Email job failed');
});

campaignWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Campaign job failed');
});

warmupWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Warmup job failed');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down workers...');
  await emailWorker.close();
  await campaignWorker.close();
  await warmupWorker.close();
  await aiWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info('Workers started');