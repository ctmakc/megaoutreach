import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { db } from '../../db/index.js';
import { linkedinAccounts, linkedinActions } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { decrypt, encrypt } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { randomDelay, humanType, addVariance, getRandomUserAgent } from '../../utils/humanize.js';

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  lastActivity: Date;
}

interface LoginResult {
  success: boolean;
  requiresVerification?: boolean;
  cookies?: string;
  profileUrl?: string;
  profileName?: string;
  error?: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  headline?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  summary?: string;
  connections?: number;
  profileImageUrl?: string;
}

class LinkedInService {
  private sessions: Map<string, BrowserSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Cleanup inactive sessions periodically
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1000);
  }

  private async getBrowser(accountId: string, proxyUrl?: string): Promise<BrowserSession> {
    const existing = this.sessions.get(accountId);

    if (existing) {
      existing.lastActivity = new Date();
      return existing;
    }

    // Get account for session cookie
    const account = await db.query.linkedinAccounts.findFirst({
      where: eq(linkedinAccounts.id, accountId),
    });

    // Launch browser with stealth settings
    const launchOptions: any = {
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    };

    if (proxyUrl) {
      launchOptions.proxy = { server: proxyUrl };
    }

    const browser = await chromium.launch(launchOptions);

    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1366, height: 768 },
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      geolocation: { latitude: 55.7558, longitude: 37.6173 },
      permissions: ['geolocation'],
    });

    // Restore session cookie if exists
    if (account?.cookies) {
      const cookies = JSON.parse(decrypt(account.cookies));
      await context.addCookies(cookies);
    }

    // Add stealth scripts
    await context.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });

      // Override chrome property
      (window as any).chrome = { runtime: {} };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);
    });

    const page = await context.newPage();

    const session: BrowserSession = {
      browser,
      context,
      page,
      lastActivity: new Date(),
    };

    this.sessions.set(accountId, session);

    return session;
  }

  async closeBrowser(accountId: string): Promise<void> {
    const session = this.sessions.get(accountId);
    if (session) {
      await session.browser.close();
      this.sessions.delete(accountId);
    }
  }

  private cleanupSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        session.browser.close().catch(() => {});
        this.sessions.delete(id);
        logger.info({ accountId: id }, 'Cleaned up inactive LinkedIn session');
      }
    }
  }

  async login(
    accountId: string,
    email: string,
    password: string,
    proxyUrl?: string,
    verificationCode?: string
  ): Promise<LoginResult> {
    const session = await this.getBrowser(accountId, proxyUrl);
    const { page } = session;

    try {
      // Navigate to LinkedIn
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);

      // Check if already logged in
      if (page.url().includes('/feed')) {
        return await this.extractProfileInfo(page);
      }

      // Check for verification page
      if (page.url().includes('/checkpoint') || await page.$('#input__email_verification_pin')) {
        if (!verificationCode) {
          return {
            success: false,
            requiresVerification: true,
          };
        }

        // Enter verification code
        await page.fill('#input__email_verification_pin', verificationCode);
        await randomDelay(500, 1000);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle' });

        if (page.url().includes('/feed')) {
          return await this.extractProfileInfo(page);
        }

        return {
          success: false,
          error: 'Verification failed',
        };
      }

      // Fill login form with human-like typing
      await page.click('#username');
      await randomDelay(300, 600);
      await humanType(page, '#username', email);

      await randomDelay(500, 1000);

      await page.click('#password');
      await randomDelay(300, 600);
      await humanType(page, '#password', password);

      await randomDelay(800, 1500);

      // Click sign in
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

      // Check for verification requirement
      if (page.url().includes('/checkpoint') || await page.$('#input__email_verification_pin')) {
        return {
          success: false,
          requiresVerification: true,
        };
      }

      // Check for error
      const errorElement = await page.$('.form__label--error');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        return {
          success: false,
          error: errorText || 'Login failed',
        };
      }

      // Check for successful login
      if (page.url().includes('/feed') || page.url().includes('/mynetwork')) {
        return await this.extractProfileInfo(page);
      }

      return {
        success: false,
        error: 'Unexpected page after login',
      };

    } catch (error: any) {
      logger.error({ error, accountId }, 'LinkedIn login error');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async extractProfileInfo(page: Page): Promise<LoginResult> {
    try {
      // Get session cookies
      const cookiesData = await page.context().cookies();
      const cookies = JSON.stringify(cookiesData);

      // Navigate to profile
      await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'networkidle' });
      await randomDelay(2000, 3000);

      const profileUrl = page.url();
      const profileName = await page.$eval(
        'h1.text-heading-xlarge',
        el => el.textContent?.trim() || ''
      ).catch(() => '');

      return {
        success: true,
        cookies,
        profileUrl,
        profileName,
      };
    } catch (error: any) {
      return {
        success: true,
        cookies: JSON.stringify(await page.context().cookies()),
      };
    }
  }

  async sendConnectionRequest(
    accountId: string,
    profileUrl: string,
    note?: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = await this.getBrowser(accountId);
    const { page } = session;

    try {
      // Navigate to profile
      await page.goto(profileUrl, { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);

      // Check if already connected
      const messageButton = await page.$('button:has-text("Message")');
      if (messageButton) {
        return { success: false, error: 'Already connected' };
      }

      // Find connect button
      const connectButton = await page.$('button:has-text("Connect")')
        || await page.$('button[aria-label*="connect" i]')
        || await page.$('div.pvs-profile-actions button:has-text("Connect")');

      if (!connectButton) {
        // Try More button -> Connect
        const moreButton = await page.$('button:has-text("More")');
        if (moreButton) {
          await moreButton.click();
          await randomDelay(500, 1000);
          const connectInMenu = await page.$('div[role="menu"] span:has-text("Connect")');
          if (connectInMenu) {
            await connectInMenu.click();
          } else {
            return { success: false, error: 'Connect button not found' };
          }
        } else {
          return { success: false, error: 'Connect button not found' };
        }
      } else {
        await connectButton.click();
      }

      await randomDelay(1000, 2000);

      // Check for "How do you know" modal
      const howDoYouKnow = await page.$('button:has-text("Other")');
      if (howDoYouKnow) {
        await howDoYouKnow.click();
        await randomDelay(500, 1000);
      }

      // Add note if provided
      if (note) {
        const addNoteButton = await page.$('button:has-text("Add a note")');
        if (addNoteButton) {
          await addNoteButton.click();
          await randomDelay(500, 1000);

          const noteTextarea = await page.$('textarea[name="message"]')
            || await page.$('textarea#custom-message');

          if (noteTextarea) {
            await humanType(page, 'textarea', note);
            await randomDelay(500, 1000);
          }
        }
      }

      // Send connection request
      const sendButton = await page.$('button:has-text("Send")')
        || await page.$('button[aria-label="Send now"]');

      if (sendButton) {
        await sendButton.click();
        await randomDelay(1000, 2000);

        // Log action
        await db.insert(linkedinActions).values({
          linkedinAccountId: accountId,
          actionType: 'connect',
          targetUrl: profileUrl,
          note,
          status: 'completed',
        });

        // Update daily count
        await db.update(linkedinAccounts)
          .set({
            connectionsSentToday: sql`${linkedinAccounts.connectionsSentToday} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(linkedinAccounts.id, accountId));

        return { success: true };
      }

      return { success: false, error: 'Send button not found' };

    } catch (error: any) {
      logger.error({ error, accountId, profileUrl }, 'Failed to send connection request');

      await db.insert(linkedinActions).values({
        linkedinAccountId: accountId,
        actionType: 'connect',
        targetUrl: profileUrl,
        note,
        status: 'failed',
        errorMessage: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  async sendMessage(
    accountId: string,
    profileUrl: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = await this.getBrowser(accountId);
    const { page } = session;

    try {
      // Navigate to profile
      await page.goto(profileUrl, { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);

      // Click message button
      const messageButton = await page.$('button:has-text("Message")');
      if (!messageButton) {
        return { success: false, error: 'Not connected - cannot message' };
      }

      await messageButton.click();
      await randomDelay(1500, 2500);

      // Wait for message modal
      const messageBox = await page.waitForSelector(
        'div[role="textbox"][contenteditable="true"]',
        { timeout: 10000 }
      );

      if (!messageBox) {
        return { success: false, error: 'Message box not found' };
      }

      // Type message with human-like behavior
      await messageBox.click();
      await randomDelay(300, 600);

      // Split message into chunks for more natural typing
      const chunks = message.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        await page.keyboard.type(chunk, { delay: addVariance(50, 30) });
        await randomDelay(100, 300);
      }

      await randomDelay(1000, 2000);

      // Send message
      const sendButton = await page.$('button:has-text("Send")')
        || await page.$('button[type="submit"]:has-text("Send")');

      if (sendButton) {
        await sendButton.click();
        await randomDelay(1000, 2000);

        // Close modal
        const closeButton = await page.$('button[aria-label="Close"]');
        if (closeButton) {
          await closeButton.click();
        }

        // Log action
        await db.insert(linkedinActions).values({
          linkedinAccountId: accountId,
          actionType: 'message',
          targetUrl: profileUrl,
          message,
          status: 'completed',
        });

        // Update daily count
        await db.update(linkedinAccounts)
          .set({
            messagesSentToday: sql`${linkedinAccounts.messagesSentToday} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(linkedinAccounts.id, accountId));

        return { success: true };
      }

      return { success: false, error: 'Send button not found' };

    } catch (error: any) {
      logger.error({ error, accountId, profileUrl }, 'Failed to send message');

      await db.insert(linkedinActions).values({
        linkedinAccountId: accountId,
        actionType: 'message',
        targetUrl: profileUrl,
        message,
        status: 'failed',
        errorMessage: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  async visitProfile(accountId: string, profileUrl: string): Promise<ProfileData | null> {
    const session = await this.getBrowser(accountId);
    const { page } = session;

    try {
      await page.goto(profileUrl, { waitUntil: 'networkidle' });
      await randomDelay(3000, 6000);

      // Scroll down to simulate reading
      await page.mouse.wheel(0, addVariance(500, 30));
      await randomDelay(1000, 2000);
      await page.mouse.wheel(0, addVariance(300, 30));
      await randomDelay(500, 1000);

      // Extract profile data
      const data = await this.scrapeProfileData(page);

      // Log action
      await db.insert(linkedinActions).values({
        linkedinAccountId: accountId,
        actionType: 'visit',
        targetUrl: profileUrl,
        status: 'completed',
      });

      return data;

    } catch (error: any) {
      logger.error({ error, accountId, profileUrl }, 'Failed to visit profile');
      return null;
    }
  }

  async scrapeProfile(accountId: string, profileUrl: string): Promise<ProfileData> {
    const session = await this.getBrowser(accountId);
    const { page } = session;

    await page.goto(profileUrl, { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);

    return this.scrapeProfileData(page);
  }

  private async scrapeProfileData(page: Page): Promise<ProfileData> {
    const data: ProfileData = {
      firstName: '',
      lastName: '',
    };

    try {
      // Full name
      const fullName = await page.$eval(
        'h1.text-heading-xlarge',
        el => el.textContent?.trim() || ''
      ).catch(() => '');

      const nameParts = fullName.split(' ');
      data.firstName = nameParts[0] || '';
      data.lastName = nameParts.slice(1).join(' ') || '';

      // Headline
      data.headline = await page.$eval(
        'div.text-body-medium',
        el => el.textContent?.trim()
      ).catch(() => undefined);

      // Extract job title and company from headline
      if (data.headline) {
        const atIndex = data.headline.indexOf(' at ');
        const atIndex2 = data.headline.indexOf(' @ ');
        const separator = atIndex > -1 ? ' at ' : atIndex2 > -1 ? ' @ ' : null;

        if (separator) {
          const idx = data.headline.indexOf(separator);
          data.jobTitle = data.headline.substring(0, idx).trim();
          data.company = data.headline.substring(idx + separator.length).trim();
        } else {
          data.jobTitle = data.headline;
        }
      }

      // Location
      data.location = await page.$eval(
        'span.text-body-small.inline',
        el => el.textContent?.trim()
      ).catch(() => undefined);

      // Summary/About
      data.summary = await page.$eval(
        '#about ~ div.display-flex span[aria-hidden="true"]',
        el => el.textContent?.trim()
      ).catch(() => undefined);

      // Connections count
      const connectionsText = await page.$eval(
        'span.t-bold:has-text("connections")',
        el => el.textContent?.trim()
      ).catch(() => '');

      const connectionsMatch = connectionsText.match(/(\d+)/);
      if (connectionsMatch) {
        data.connections = parseInt(connectionsMatch[1], 10);
      }

      // Profile image
      data.profileImageUrl = await page.$eval(
        'img.pv-top-card-profile-picture__image',
        el => el.getAttribute('src') || undefined
      ).catch(() => undefined);

    } catch (error) {
      logger.error({ error }, 'Error scraping profile data');
    }

    return data;
  }

  async searchProfiles(
    accountId: string,
    query?: string,
    filters?: any,
    page: number = 1
  ): Promise<{ profiles: ProfileData[]; hasMore: boolean }> {
    const session = await this.getBrowser(accountId);
    const { page: browserPage } = session;

    try {
      // Build search URL
      let searchUrl = 'https://www.linkedin.com/search/results/people/?';
      const params = new URLSearchParams();

      if (query || filters?.keywords) {
        params.set('keywords', query || filters?.keywords || '');
      }

      if (filters?.connectionDegree) {
        const networkMap: Record<string, string> = {
          '1st': 'F',
          '2nd': 'S',
          '3rd': 'O',
        };
        params.set('network', `["${networkMap[filters.connectionDegree]}"]`);
      }

      if (page > 1) {
        params.set('page', String(page));
      }

      searchUrl += params.toString();

      await browserPage.goto(searchUrl, { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);

      // Scroll to load results
      await browserPage.mouse.wheel(0, 500);
      await randomDelay(1000, 2000);

      // Extract profiles
      const profiles: ProfileData[] = [];
      const profileCards = await browserPage.$$('li.reusable-search__result-container');

      for (const card of profileCards.slice(0, 10)) {
        try {
          const name = await card.$eval(
            'span.entity-result__title-text a span[aria-hidden="true"]',
            el => el.textContent?.trim() || ''
          ).catch(() => '');

          const headline = await card.$eval(
            'div.entity-result__primary-subtitle',
            el => el.textContent?.trim()
          ).catch(() => undefined);

          const location = await card.$eval(
            'div.entity-result__secondary-subtitle',
            el => el.textContent?.trim()
          ).catch(() => undefined);

          const nameParts = name.split(' ');

          profiles.push({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            headline,
            location,
          });
        } catch {
          continue;
        }
      }

      // Check for more results
      const hasMore = await browserPage.$('button[aria-label="Next"]') !== null;

      return { profiles, hasMore };

    } catch (error: any) {
      logger.error({ error, accountId }, 'Failed to search profiles');
      return { profiles: [], hasMore: false };
    }
  }

  async syncInbox(accountId: string): Promise<{ newMessages: number }> {
    const session = await this.getBrowser(accountId);
    const { page } = session;

    try {
      await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);

      // This would sync and process new messages
      // Implementation depends on specific requirements

      return { newMessages: 0 };

    } catch (error: any) {
      logger.error({ error, accountId }, 'Failed to sync inbox');
      return { newMessages: 0 };
    }
  }
}

export const linkedinService = new LinkedInService();
