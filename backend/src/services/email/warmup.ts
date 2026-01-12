import { db } from '../../db/index.js';
import { emailAccounts, emailWarmupLogs } from '../../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { sendEmail } from './sender.js';
import { logger } from '../../utils/logger.js';
import { randomDelay, shuffleArray } from '../../utils/humanize.js';

interface WarmupConfig {
  // Warmup schedule (day -> emails to send)
  schedule: Record<number, { min: number; max: number }>;
  // Warmup email content variations
  subjects: string[];
  bodies: string[];
  // Partner accounts for warming
  partnerEmails: string[];
}

const DEFAULT_WARMUP_CONFIG: WarmupConfig = {
  schedule: {
    1: { min: 2, max: 3 },
    2: { min: 3, max: 4 },
    3: { min: 4, max: 5 },
    4: { min: 5, max: 6 },
    5: { min: 5, max: 7 },
    6: { min: 6, max: 8 },
    7: { min: 7, max: 9 },
    // Week 2
    8: { min: 8, max: 11 },
    9: { min: 9, max: 12 },
    10: { min: 10, max: 14 },
    11: { min: 11, max: 15 },
    12: { min: 12, max: 17 },
    13: { min: 14, max: 19 },
    14: { min: 15, max: 20 },
    // Week 3
    15: { min: 17, max: 23 },
    16: { min: 19, max: 25 },
    17: { min: 21, max: 28 },
    18: { min: 23, max: 30 },
    19: { min: 25, max: 33 },
    20: { min: 27, max: 35 },
    21: { min: 30, max: 38 },
    // Week 4
    22: { min: 33, max: 42 },
    23: { min: 36, max: 46 },
    24: { min: 40, max: 50 },
    25: { min: 44, max: 55 },
    26: { min: 48, max: 60 },
    27: { min: 52, max: 65 },
    28: { min: 55, max: 70 },
    // Week 5+
    29: { min: 60, max: 75 },
    30: { min: 65, max: 80 },
    31: { min: 70, max: 85 },
    32: { min: 75, max: 90 },
    33: { min: 80, max: 95 },
    34: { min: 85, max: 100 },
    35: { min: 90, max: 100 },
  },
  subjects: [
    'Re: Вопрос по проекту',
    'Fw: Документы на согласование',
    'Встреча завтра',
    'Re: Re: Предложение',
    'Информация по запросу',
    'Подтверждение получения',
    'Re: Уточнение деталей',
    'Согласование',
    'Fw: Важная информация',
    'Re: Договор',
    'Планы на неделю',
    'Re: Счет',
    'Вопрос по доставке',
    'Результаты встречи',
    'Re: Fw: Обсуждение',
  ],
  bodies: [
    'Добрый день!\n\nСпасибо за информацию. Изучу и вернусь с ответом.\n\nС уважением',
    'Здравствуйте!\n\nПолучил ваше письмо. Всё понятно, приступаем к работе.\n\nСпасибо!',
    'Привет!\n\nОтлично, договорились. Жду подтверждения.\n\nУдачного дня!',
    'Добрый день!\n\nДа, всё верно. Подтверждаю получение.\n\nС уважением',
    'Здравствуйте!\n\nСпасибо за оперативный ответ. Согласен с предложенным вариантом.\n\nВсего доброго',
    'Привет!\n\nХорошо, принято. Буду на связи.\n\nСпасибо!',
    'Добрый день!\n\nОзнакомился с материалами. Есть пара вопросов, напишу отдельно.\n\nС уважением',
    'Здравствуйте!\n\nВсё получил, спасибо. Перезвоню сегодня после обеда.\n\nДо связи',
  ],
  partnerEmails: [], // Will be filled from other warmup accounts
};

export class WarmupService {
  private config: WarmupConfig;
  
  constructor(config: Partial<WarmupConfig> = {}) {
    this.config = { ...DEFAULT_WARMUP_CONFIG, ...config };
  }
  
  async runWarmupCycle(accountId: string): Promise<void> {
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.status, 'warming'),
        eq(emailAccounts.isActive, true)
      ),
    });
    
    if (!account) {
      logger.info({ accountId }, 'Account not in warmup mode or not active');
      return;
    }
    
    const warmupDay = account.warmupDay || 0;
    const daySchedule = this.config.schedule[Math.min(warmupDay, 35)] || { min: 90, max: 100 };
    
    // Calculate emails to send today
    const emailsToSend = Math.floor(
      Math.random() * (daySchedule.max - daySchedule.min + 1) + daySchedule.min
    );
    
    // Get partner accounts for warming
    const partnerAccounts = await db.query.emailAccounts.findMany({
      where: and(
        eq(emailAccounts.status, 'warming'),
        eq(emailAccounts.isActive, true),
        sql`${emailAccounts.id} != ${accountId}`
      ),
      limit: 10,
    });
    
    const partnerEmails = partnerAccounts.map(a => a.email);
    
    if (partnerEmails.length === 0) {
      logger.warn({ accountId }, 'No partner accounts for warmup');
      // Could use external warmup service emails here
      return;
    }
    
    // Send warmup emails
    const shuffledPartners = shuffleArray(partnerEmails);
    let sent = 0;
    let received = 0;
    
    for (let i = 0; i < emailsToSend && i < shuffledPartners.length * 3; i++) {
      const partnerEmail = shuffledPartners[i % shuffledPartners.length];
      const subject = this.getRandomSubject();
      const body = this.getRandomBody();
      
      try {
        const result = await sendEmail({
          accountId,
          to: partnerEmail,
          subject,
          html: body,
          trackOpens: false,
          trackClicks: false,
        });
        
        if (result.success) {
          sent++;
        }
        
        // Random delay between warmup emails (more natural)
        await randomDelay(60000, 300000); // 1-5 minutes
        
      } catch (error) {
        logger.error({ error, accountId, to: partnerEmail }, 'Warmup email failed');
      }
    }
    
    // Log warmup activity
    await db.insert(emailWarmupLogs).values({
      emailAccountId: accountId,
      date: new Date(),
      emailsSent: sent,
      emailsReceived: received,
      healthScore: 100, // Will be updated based on bounces/spam
    }).onConflictDoUpdate({
      target: [emailWarmupLogs.emailAccountId, emailWarmupLogs.date],
      set: {
        emailsSent: sql`${emailWarmupLogs.emailsSent} + ${sent}`,
      },
    });
    
    // Update account warmup day and daily limit
    const newWarmupDay = warmupDay + 1;
    const newDailyLimit = this.calculateDailyLimit(newWarmupDay);
    
    await db.update(emailAccounts)
      .set({
        warmupDay: newWarmupDay,
        dailyLimit: newDailyLimit,
        status: newWarmupDay >= 35 ? 'ready' : 'warming',
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));
    
    logger.info({
      accountId,
      warmupDay: newWarmupDay,
      emailsSent: sent,
      newDailyLimit,
    }, 'Warmup cycle completed');
  }
  
  private getRandomSubject(): string {
    return this.config.subjects[Math.floor(Math.random() * this.config.subjects.length)];
  }
  
  private getRandomBody(): string {
    const body = this.config.bodies[Math.floor(Math.random() * this.config.bodies.length)];
    
    // Add some randomization
    const greetings = ['Добрый день', 'Здравствуйте', 'Привет', 'Доброго времени суток'];
    const closings = ['С уважением', 'Всего доброго', 'До связи', 'Спасибо', 'Удачи'];
    
    return body
      .replace(/^(Добрый день|Здравствуйте|Привет)/, greetings[Math.floor(Math.random() * greetings.length)])
      .replace(/(С уважением|Спасибо|Удачного дня|Всего доброго|До связи)$/, closings[Math.floor(Math.random() * closings.length)]);
  }
  
  private calculateDailyLimit(warmupDay: number): number {
    const schedule = this.config.schedule[Math.min(warmupDay, 35)] || { min: 90, max: 100 };
    return schedule.max;
  }
  
  // Reply to received warmup emails (important for reputation)
  async processReceivedEmails(accountId: string): Promise<void> {
    // This would use IMAP to check for replies and respond
    // Implementation depends on IMAP library choice
    logger.info({ accountId }, 'Processing received emails for warmup');
  }
  
  // Calculate health score based on metrics
  async calculateHealthScore(accountId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const logs = await db.query.emailWarmupLogs.findMany({
      where: and(
        eq(emailWarmupLogs.emailAccountId, accountId),
        gte(emailWarmupLogs.date, thirtyDaysAgo)
      ),
    });
    
    if (logs.length === 0) return 100;
    
    const totals = logs.reduce((acc, log) => ({
      sent: acc.sent + (log.emailsSent || 0),
      bounces: acc.bounces + (log.bounces || 0),
      spam: acc.spam + (log.spamReports || 0),
      replies: acc.replies + (log.repliesSent || 0),
    }), { sent: 0, bounces: 0, spam: 0, replies: 0 });
    
    let score = 100;
    
    // Penalize bounces (each bounce = -2 points)
    score -= totals.bounces * 2;
    
    // Heavily penalize spam reports (each = -10 points)
    score -= totals.spam * 10;
    
    // Reward replies (+0.5 per reply, max +10)
    score += Math.min(10, totals.replies * 0.5);
    
    // Reward consistent sending (+0.2 per day with activity, max +6)
    score += Math.min(6, logs.length * 0.2);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

export const warmupService = new WarmupService();