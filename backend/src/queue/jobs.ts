import { Queue } from 'bullmq';
import { redis } from '../utils/redis.js';

// Email queue
export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

// LinkedIn queue
export const linkedinQueue = new Queue('linkedin', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 60000, // 1 minute between retries
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

// Campaign queue
export const campaignQueue = new Queue('campaign', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

// Helper functions
export async function addEmailJob(data: {
  emailAccountId: string;
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  contactId?: string;
  campaignId?: string;
  campaignContactId?: string;
  stepId?: string;
  replyToMessageId?: string;
  scheduledFor?: Date;
}) {
  const delay = data.scheduledFor 
    ? Math.max(0, data.scheduledFor.getTime() - Date.now())
    : 0;
  
  return emailQueue.add('send', data, {
    delay,
    jobId: `email-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

export async function addLinkedinJob(data: {
  accountId: string;
  action: 'connect' | 'message' | 'visit' | 'follow';
  targetUrl: string;
  note?: string;
  message?: string;
  contactId?: string;
  campaignId?: string;
  campaignContactId?: string;
  stepId?: string;
  scheduledFor?: Date;
}) {
  const delay = data.scheduledFor
    ? Math.max(0, data.scheduledFor.getTime() - Date.now())
    : 0;
  
  return linkedinQueue.add(data.action, data, {
    delay,
    jobId: `linkedin-${data.action}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

export async function addCampaignJob(data: {
  campaignId: string;
  action: 'process-step' | 'check-replies' | 'update-stats';
  stepId?: string;
  contactIds?: string[];
}) {
  return campaignQueue.add(data.action, data, {
    jobId: `campaign-${data.action}-${data.campaignId}-${Date.now()}`,
  });
}