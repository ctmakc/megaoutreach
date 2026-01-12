import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============ ENUMS ============

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed', 'archived']);
export const campaignChannelEnum = pgEnum('campaign_channel', ['email', 'linkedin', 'multi']);
export const contactStatusEnum = pgEnum('contact_status', ['new', 'enriched', 'contacted', 'replied', 'meeting_scheduled', 'converted', 'unsubscribed', 'bounced']);
export const messageStatusEnum = pgEnum('message_status', ['pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed']);
export const emailAccountStatusEnum = pgEnum('email_account_status', ['warming', 'ready', 'limited', 'blocked']);
export const linkedinAccountStatusEnum = pgEnum('linkedin_account_status', ['active', 'limited', 'blocked', 'verification_needed']);

// ============ ORGANIZATIONS (Multi-tenant / SaaS ready) ============

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).default('free').notNull(), // free, starter, pro, enterprise
  settings: jsonb('settings').default({}).$type<OrganizationSettings>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type OrganizationSettings = {
  timezone?: string;
  dailyEmailLimit?: number;
  dailyLinkedinLimit?: number;
  defaultFromName?: string;
};

// ============ USERS ============

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  googleId: varchar('google_id', { length: 255 }).unique(),
  googleRefreshToken: text('google_refresh_token'),
  organizationId: uuid('organization_id').references(() => organizations.id),
  role: userRoleEnum('role').default('member').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  orgIdx: index('users_org_idx').on(table.organizationId),
}));

// ============ EMAIL ACCOUNTS ============

export const emailAccounts = pgTable('email_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  
  // SMTP settings
  smtpHost: varchar('smtp_host', { length: 255 }).notNull(),
  smtpPort: integer('smtp_port').default(587).notNull(),
  smtpUser: varchar('smtp_user', { length: 255 }).notNull(),
  smtpPassword: text('smtp_password').notNull(), // encrypted
  smtpSecure: boolean('smtp_secure').default(false),
  
  // IMAP settings (for reading replies)
  imapHost: varchar('imap_host', { length: 255 }),
  imapPort: integer('imap_port').default(993),
  imapUser: varchar('imap_user', { length: 255 }),
  imapPassword: text('imap_password'),
  
  // Warmup & limits
  status: emailAccountStatusEnum('status').default('warming').notNull(),
  warmupStartDate: timestamp('warmup_start_date'),
  warmupDay: integer('warmup_day').default(0),
  dailyLimit: integer('daily_limit').default(20).notNull(),
  sentToday: integer('sent_today').default(0).notNull(),
  lastSentAt: timestamp('last_sent_at'),
  
  // Health metrics
  deliveryRate: integer('delivery_rate').default(100), // percentage
  bounceRate: integer('bounce_rate').default(0),
  replyRate: integer('reply_rate').default(0),
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('email_accounts_org_idx').on(table.organizationId),
  statusIdx: index('email_accounts_status_idx').on(table.status),
}));

// ============ LINKEDIN ACCOUNTS ============

export const linkedinAccounts = pgTable('linkedin_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  // Profile info
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  name: varchar('name', { length: 255 }),
  headline: text('headline'),
  avatarUrl: text('avatar_url'),
  
  // Session data (encrypted)
  cookies: text('cookies'),
  localStorage: text('local_storage'),
  userAgent: text('user_agent'),
  
  // Proxy settings
  proxyUrl: text('proxy_url'),
  
  // Limits
  status: linkedinAccountStatusEnum('status').default('active').notNull(),
  dailyConnectionLimit: integer('daily_connection_limit').default(20).notNull(),
  dailyMessageLimit: integer('daily_message_limit').default(50).notNull(),
  connectionsSentToday: integer('connections_sent_today').default(0).notNull(),
  messagesSentToday: integer('messages_sent_today').default(0).notNull(),
  lastActivityAt: timestamp('last_activity_at'),
  
  // Health
  weeklyConnectionsAccepted: integer('weekly_connections_accepted').default(0),
  weeklyReplies: integer('weekly_replies').default(0),
  warningsCount: integer('warnings_count').default(0),
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('linkedin_accounts_org_idx').on(table.organizationId),
}));

// ============ CONTACTS ============

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  // Basic info
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  
  // Company info
  company: varchar('company', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  companyWebsite: varchar('company_website', { length: 500 }),
  
  // LinkedIn
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  linkedinId: varchar('linkedin_id', { length: 100 }),
  
  // Location
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }),
  
  // Enriched data
  enrichedData: jsonb('enriched_data').default({}).$type<EnrichedContactData>(),
  enrichedAt: timestamp('enriched_at'),
  
  // Status tracking
  status: contactStatusEnum('status').default('new').notNull(),
  tags: jsonb('tags').default([]).$type<string[]>(),
  notes: text('notes'),
  
  // Source
  source: varchar('source', { length: 100 }), // csv_import, linkedin_search, manual, etc
  sourceDetails: jsonb('source_details').default({}),
  
  // Engagement
  lastContactedAt: timestamp('last_contacted_at'),
  lastRepliedAt: timestamp('last_replied_at'),
  totalEmailsSent: integer('total_emails_sent').default(0),
  totalEmailsOpened: integer('total_emails_opened').default(0),
  totalReplies: integer('total_replies').default(0),
  
  isUnsubscribed: boolean('is_unsubscribed').default(false),
  unsubscribedAt: timestamp('unsubscribed_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('contacts_org_idx').on(table.organizationId),
  emailIdx: index('contacts_email_idx').on(table.email),
  statusIdx: index('contacts_status_idx').on(table.status),
  linkedinIdx: index('contacts_linkedin_idx').on(table.linkedinUrl),
  companyIdx: index('contacts_company_idx').on(table.company),
}));

export type EnrichedContactData = {
  socialProfiles?: Record<string, string>;
  companyInfo?: {
    revenue?: string;
    employees?: number;
    founded?: number;
    description?: string;
  };
  technologies?: string[];
  recentNews?: string[];
};

// ============ CAMPAIGNS ============

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  createdById: uuid('created_by_id').references(() => users.id),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  channel: campaignChannelEnum('channel').default('email').notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  
  // Settings
  settings: jsonb('settings').default({}).$type<CampaignSettings>(),
  
  // Schedule
  scheduleTimezone: varchar('schedule_timezone', { length: 50 }).default('UTC'),
  scheduleStartTime: varchar('schedule_start_time', { length: 5 }).default('09:00'), // HH:mm
  scheduleEndTime: varchar('schedule_end_time', { length: 5 }).default('18:00'),
  scheduleDays: jsonb('schedule_days').default([1,2,3,4,5]).$type<number[]>(), // 0=Sun, 1=Mon, etc
  
  // Stats (denormalized for quick access)
  totalContacts: integer('total_contacts').default(0),
  contacted: integer('contacted').default(0),
  opened: integer('opened').default(0),
  replied: integer('replied').default(0),
  meetings: integer('meetings').default(0),
  
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('campaigns_org_idx').on(table.organizationId),
  statusIdx: index('campaigns_status_idx').on(table.status),
}));

export type CampaignSettings = {
  dailyLimit?: number;
  minDelayBetweenEmails?: number; // minutes
  maxDelayBetweenEmails?: number;
  stopOnReply?: boolean;
  stopOnMeeting?: boolean;
  trackOpens?: boolean;
  trackClicks?: boolean;
  aiAutoRespond?: boolean;
  aiRespondPrompt?: string;
};

// ============ CAMPAIGN SEQUENCES ============

export const campaignSteps = pgTable('campaign_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  
  stepNumber: integer('step_number').notNull(),
  channel: campaignChannelEnum('channel').default('email').notNull(),
  
  // Timing
  delayDays: integer('delay_days').default(0).notNull(),
  delayHours: integer('delay_hours').default(0).notNull(),
  
  // Email content
  subject: text('subject'),
  body: text('body'),
  
  // LinkedIn content
  linkedinAction: varchar('linkedin_action', { length: 50 }), // connect, message, inmail, follow
  linkedinMessage: text('linkedin_message'),
  linkedinNote: text('linkedin_note'), // connection request note
  
  // Conditions
  conditions: jsonb('conditions').default({}).$type<StepConditions>(),
  
  // AI
  useAiPersonalization: boolean('use_ai_personalization').default(false),
  aiPrompt: text('ai_prompt'),
  
  // Stats
  sent: integer('sent').default(0),
  opened: integer('opened').default(0),
  clicked: integer('clicked').default(0),
  replied: integer('replied').default(0),
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  campaignIdx: index('campaign_steps_campaign_idx').on(table.campaignId),
  stepIdx: index('campaign_steps_step_idx').on(table.campaignId, table.stepNumber),
}));

export type StepConditions = {
  onlyIfOpened?: boolean;
  onlyIfClicked?: boolean;
  onlyIfNotReplied?: boolean;
  skipIfLinkedinConnected?: boolean;
};

// ============ CAMPAIGN CONTACTS ============

export const campaignContacts = pgTable('campaign_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  
  currentStep: integer('current_step').default(0).notNull(),
  status: contactStatusEnum('status').default('new').notNull(),
  
  // Scheduling
  nextActionAt: timestamp('next_action_at'),
  
  // Personalization variables
  variables: jsonb('variables').default({}).$type<Record<string, string>>(),
  
  // Tracking
  addedAt: timestamp('added_at').defaultNow().notNull(),
  firstContactedAt: timestamp('first_contacted_at'),
  lastContactedAt: timestamp('last_contacted_at'),
  repliedAt: timestamp('replied_at'),
  meetingScheduledAt: timestamp('meeting_scheduled_at'),
  convertedAt: timestamp('converted_at'),
  
  // Error handling
  errorCount: integer('error_count').default(0),
  lastError: text('last_error'),
  
  isActive: boolean('is_active').default(true),
}, (table) => ({
  campaignContactIdx: uniqueIndex('campaign_contacts_unique_idx').on(table.campaignId, table.contactId),
  nextActionIdx: index('campaign_contacts_next_action_idx').on(table.nextActionAt),
  statusIdx: index('campaign_contacts_status_idx').on(table.status),
}));

// ============ MESSAGES ============

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  campaignContactId: uuid('campaign_contact_id').references(() => campaignContacts.id),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  stepId: uuid('step_id').references(() => campaignSteps.id),
  
  channel: campaignChannelEnum('channel').notNull(),
  direction: varchar('direction', { length: 10 }).notNull(), // outbound, inbound
  
  // Email specific
  emailAccountId: uuid('email_account_id').references(() => emailAccounts.id),
  fromEmail: varchar('from_email', { length: 255 }),
  toEmail: varchar('to_email', { length: 255 }),
  subject: text('subject'),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  messageId: varchar('message_id', { length: 255 }), // email Message-ID header
  inReplyTo: varchar('in_reply_to', { length: 255 }), // for threading
  
  // LinkedIn specific
  linkedinAccountId: uuid('linkedin_account_id').references(() => linkedinAccounts.id),
  linkedinConversationId: varchar('linkedin_conversation_id', { length: 255 }),
  linkedinMessageUrn: varchar('linkedin_message_urn', { length: 255 }),
  
  // Status & tracking
  status: messageStatusEnum('status').default('pending').notNull(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  repliedAt: timestamp('replied_at'),
  bouncedAt: timestamp('bounced_at'),
  
  // Opens/clicks tracking
  opensCount: integer('opens_count').default(0),
  clicksCount: integer('clicks_count').default(0),
  clickedLinks: jsonb('clicked_links').default([]).$type<string[]>(),
  
  // AI
  aiGenerated: boolean('ai_generated').default(false),
  aiClassification: varchar('ai_classification', { length: 50 }), // positive, negative, question, meeting_request, etc
  
  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Tracking pixel ID
  trackingId: varchar('tracking_id', { length: 50 }).unique(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('messages_org_idx').on(table.organizationId),
  campaignIdx: index('messages_campaign_idx').on(table.campaignId),
  contactIdx: index('messages_contact_idx').on(table.contactId),
  statusIdx: index('messages_status_idx').on(table.status),
  trackingIdx: uniqueIndex('messages_tracking_idx').on(table.trackingId),
  sentAtIdx: index('messages_sent_at_idx').on(table.sentAt),
}));

// ============ EMAIL WARMUP ============

export const emailWarmupLogs = pgTable('email_warmup_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  emailAccountId: uuid('email_account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }).notNull(),
  
  date: timestamp('date').defaultNow().notNull(),
  emailsSent: integer('emails_sent').default(0),
  emailsReceived: integer('emails_received').default(0),
  repliesSent: integer('replies_sent').default(0),
  spamReports: integer('spam_reports').default(0),
  bounces: integer('bounces').default(0),
  
  // Health score for the day
  healthScore: integer('health_score').default(100),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  accountDateIdx: uniqueIndex('warmup_logs_account_date_idx').on(table.emailAccountId, table.date),
}));

// ============ MEETINGS / CALENDAR ============

export const meetings = pgTable('meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  createdById: uuid('created_by_id').references(() => users.id),
  
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  // Scheduling
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  
  // Location
  location: varchar('location', { length: 255 }), // physical address
  meetingUrl: text('meeting_url'), // Google Meet, Zoom, etc
  
  // Google Calendar integration
  googleEventId: varchar('google_event_id', { length: 255 }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  
  // Status
  status: varchar('status', { length: 50 }).default('scheduled'), // scheduled, completed, cancelled, no_show
  outcome: text('outcome'),
  
  // Reminders
  remindersSent: jsonb('reminders_sent').default([]).$type<string[]>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('meetings_org_idx').on(table.organizationId),
  contactIdx: index('meetings_contact_idx').on(table.contactId),
  startTimeIdx: index('meetings_start_time_idx').on(table.startTime),
}));

// ============ AI CONVERSATIONS ============

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  
  channel: campaignChannelEnum('channel').notNull(),
  status: varchar('status', { length: 50 }).default('active'), // active, handed_off, closed
  
  // Conversation context
  context: jsonb('context').default({}).$type<ConversationContext>(),
  messages: jsonb('messages').default([]).$type<ConversationMessage[]>(),
  
  // Classification
  intent: varchar('intent', { length: 100 }), // meeting_request, pricing_question, not_interested, etc
  sentiment: varchar('sentiment', { length: 50 }), // positive, negative, neutral
  priority: integer('priority').default(0), // 0-10
  
  // Handoff
  handedOffAt: timestamp('handed_off_at'),
  handedOffTo: uuid('handed_off_to').references(() => users.id),
  handoffReason: text('handoff_reason'),
  
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('ai_conversations_org_idx').on(table.organizationId),
  contactIdx: index('ai_conversations_contact_idx').on(table.contactId),
  statusIdx: index('ai_conversations_status_idx').on(table.status),
}));

export type ConversationContext = {
  campaignGoal?: string;
  productInfo?: string;
  companyInfo?: string;
  pricingInfo?: string;
  objectionHandling?: Record<string, string>;
};

export type ConversationMessage = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  messageId?: string;
};

// ============ TEMPLATES ============

export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  createdById: uuid('created_by_id').references(() => users.id),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  channel: campaignChannelEnum('channel').default('email').notNull(),
  category: varchar('category', { length: 100 }), // cold_outreach, follow_up, meeting_request, etc
  
  // Content
  subject: text('subject'),
  body: text('body').notNull(),
  
  // Variables used
  variables: jsonb('variables').default([]).$type<string[]>(),
  
  // Stats
  timesUsed: integer('times_used').default(0),
  avgOpenRate: integer('avg_open_rate'),
  avgReplyRate: integer('avg_reply_rate'),
  
  isPublic: boolean('is_public').default(false), // shared with team
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('templates_org_idx').on(table.organizationId),
  channelIdx: index('templates_channel_idx').on(table.channel),
}));

// ============ ACTIVITY LOG ============

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  
  action: varchar('action', { length: 100 }).notNull(), // email_sent, email_opened, reply_received, meeting_scheduled, etc
  details: jsonb('details').default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('activity_logs_org_idx').on(table.organizationId),
  contactIdx: index('activity_logs_contact_idx').on(table.contactId),
  createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
}));

// ============ RELATIONS ============

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  emailAccounts: many(emailAccounts),
  linkedinAccounts: many(linkedinAccounts),
  contacts: many(contacts),
  campaigns: many(campaigns),
  templates: many(templates),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [campaigns.createdById],
    references: [users.id],
  }),
  steps: many(campaignSteps),
  contacts: many(campaignContacts),
  messages: many(messages),
}));

export const campaignStepsRelations = relations(campaignSteps, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSteps.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignContactsRelations = relations(campaignContacts, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignContacts.campaignId],
    references: [campaigns.id],
  }),
  contact: one(contacts, {
    fields: [campaignContacts.contactId],
    references: [contacts.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  messages: many(messages),
  meetings: many(meetings),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  organization: one(organizations, {
    fields: [messages.organizationId],
    references: [organizations.id],
  }),
  campaign: one(campaigns, {
    fields: [messages.campaignId],
    references: [campaigns.id],
  }),
  contact: one(contacts, {
    fields: [messages.contactId],
    references: [contacts.id],
  }),
  emailAccount: one(emailAccounts, {
    fields: [messages.emailAccountId],
    references: [emailAccounts.id],
  }),
}));