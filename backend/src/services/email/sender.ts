import { db } from '../../db/index.js';
import { emailAccounts, messages, contacts, campaigns, campaignContacts } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { getTransporter } from './smtp.js';
import { decrypt } from '../../utils/crypto.js';
import { nanoid } from 'nanoid';
import { logger } from '../../utils/logger.js';
import { randomDelay, addVariance } from '../../utils/humanize.js';

interface SendEmailParams {
  accountId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  campaignId?: string;
  campaignContactId?: string;
  contactId?: string;
  stepId?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  trackingId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  const {
    accountId,
    to,
    subject,
    html,
    text,
    replyTo,
    inReplyTo,
    references,
    campaignId,
    campaignContactId,
    contactId,
    stepId,
    trackOpens = true,
    trackClicks = true,
  } = params;

  try {
    // Get email account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      throw new Error('Email account not found');
    }

    if (!account.isActive) {
      throw new Error('Email account is not active');
    }

    // Check daily limit
    if (account.sentToday >= account.dailyLimit) {
      throw new Error('Daily sending limit reached');
    }

    // Generate tracking ID
    const trackingId = nanoid(12);

    // Process HTML for tracking
    let processedHtml = html;
    
    // Add open tracking pixel
    if (trackOpens) {
      const trackingPixel = `<img src="${process.env.BACKEND_URL}/t/o/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
      processedHtml = processedHtml.replace('</body>', `${trackingPixel}</body>`);
      
      // If no body tag, append to end
      if (!processedHtml.includes('</body>')) {
        processedHtml += trackingPixel;
      }
    }

    // Add click tracking
    if (trackClicks) {
      processedHtml = processedHtml.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (match, url) => {
          // Don't track unsubscribe links
          if (url.includes('unsubscribe')) return match;
          const encodedUrl = encodeURIComponent(url);
          return `href="${process.env.BACKEND_URL}/t/c/${trackingId}?url=${encodedUrl}"`;
        }
      );
    }

    // Add unsubscribe link if not present
    if (!processedHtml.includes('unsubscribe')) {
      const unsubLink = `<p style="font-size:11px;color:#999;margin-top:20px;">
        <a href="${process.env.BACKEND_URL}/t/u/${trackingId}" style="color:#999;">Отписаться</a>
      </p>`;
      processedHtml = processedHtml.replace('</body>', `${unsubLink}</body>`);
    }

    // Get transporter
    const transporter = getTransporter(accountId, {
      host: account.smtpHost,
      port: account.smtpPort,
      user: account.smtpUser,
      password: decrypt(account.smtpPassword),
      secure: account.smtpSecure || false,
    });

    // Build email headers
    const headers: Record<string, string> = {};
    
    if (inReplyTo) {
      headers['In-Reply-To'] = inReplyTo;
    }
    if (references) {
      headers['References'] = references;
    }
    
    // Add custom headers for deliverability
    headers['X-Mailer'] = 'Microsoft Outlook 16.0';
    headers['X-Priority'] = '3';
    headers['X-MSMail-Priority'] = 'Normal';

    // Send email
    const info = await transporter.sendMail({
      from: {
        name: account.name || account.email.split('@')[0],
        address: account.email,
      },
      to,
      replyTo: replyTo || account.email,
      subject,
      html: processedHtml,
      text: text || htmlToText(html),
      headers,
    });

    // Get organization from account for message logging
    const organization = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
      columns: { organizationId: true },
    });

    // Log message to database
    await db.insert(messages).values({
      organizationId: organization!.organizationId,
      campaignId,
      campaignContactId,
      contactId,
      stepId,
      channel: 'email',
      direction: 'outbound',
      emailAccountId: accountId,
      fromEmail: account.email,
      toEmail: to,
      subject,
      bodyHtml: processedHtml,
      bodyText: text || htmlToText(html),
      messageId: info.messageId,
      inReplyTo,
      status: 'sent',
      sentAt: new Date(),
      trackingId,
    });

    // Update account stats
    await db.update(emailAccounts)
      .set({
        sentToday: sql`${emailAccounts.sentToday} + 1`,
        lastSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    // Update campaign stats if applicable
    if (campaignId) {
      await db.update(campaigns)
        .set({
          contacted: sql`${campaigns.contacted} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));
    }

    // Update campaign contact status
    if (campaignContactId) {
      await db.update(campaignContacts)
        .set({
          lastContactedAt: new Date(),
          firstContactedAt: sql`COALESCE(${campaignContacts.firstContactedAt}, NOW())`,
        })
        .where(eq(campaignContacts.id, campaignContactId));
    }

    // Update contact stats
    if (contactId) {
      await db.update(contacts)
        .set({
          lastContactedAt: new Date(),
          totalEmailsSent: sql`${contacts.totalEmailsSent} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId));
    }

    logger.info({ to, messageId: info.messageId, trackingId }, 'Email sent successfully');

    return {
      success: true,
      messageId: info.messageId,
      trackingId,
    };

  } catch (error: any) {
    logger.error({ error, to, accountId }, 'Failed to send email');

    // Log failed message
    if (contactId) {
      const account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
        columns: { organizationId: true },
      });

      await db.insert(messages).values({
        organizationId: account!.organizationId,
        campaignId,
        campaignContactId,
        contactId,
        stepId,
        channel: 'email',
        direction: 'outbound',
        emailAccountId: accountId,
        toEmail: to,
        subject,
        bodyHtml: html,
        status: 'failed',
        errorMessage: error.message,
      });
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Batch send with delays
export async function sendBatchEmails(
  emails: SendEmailParams[],
  options: {
    minDelayMs?: number;
    maxDelayMs?: number;
    onProgress?: (sent: number, total: number) => void;
  } = {}
): Promise<SendResult[]> {
  const { minDelayMs = 30000, maxDelayMs = 90000, onProgress } = options;
  const results: SendResult[] = [];

  for (let i = 0; i < emails.length; i++) {
    const result = await sendEmail(emails[i]);
    results.push(result);

    onProgress?.(i + 1, emails.length);

    // Add random delay between emails (humanization)
    if (i < emails.length - 1) {
      const delay = addVariance((minDelayMs + maxDelayMs) / 2, 30);
      await randomDelay(Math.max(minDelayMs, delay - 10000), Math.min(maxDelayMs, delay + 10000));
    }
  }

  return results;
}

// Helper to convert HTML to plain text
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Personalize email content
export function personalizeContent(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  // Remove any remaining unreplaced variables
  result = result.replace(/\{\{\w+\}\}/g, '');
  
  return result;
}