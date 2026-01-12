-- Initial schema for MegaOutreach
-- Generated migration based on schema.ts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'member');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE campaign_channel AS ENUM ('email', 'linkedin', 'multi');
CREATE TYPE contact_status AS ENUM ('new', 'enriched', 'contacted', 'replied', 'meeting_scheduled', 'converted', 'unsubscribed', 'bounced', 'complained');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed');
CREATE TYPE email_account_status AS ENUM ('warming', 'ready', 'limited', 'blocked');
CREATE TYPE linkedin_account_status AS ENUM ('active', 'limited', 'blocked', 'verification_needed');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    google_id VARCHAR(255) UNIQUE,
    google_refresh_token TEXT,
    organization_id UUID REFERENCES organizations(id),
    role user_role NOT NULL DEFAULT 'member',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_org_idx ON users(organization_id);

-- Email accounts table
CREATE TABLE email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password TEXT NOT NULL,
    smtp_secure BOOLEAN DEFAULT false,
    imap_host VARCHAR(255),
    imap_port INTEGER DEFAULT 993,
    imap_user VARCHAR(255),
    imap_password TEXT,
    status email_account_status NOT NULL DEFAULT 'warming',
    warmup_start_date TIMESTAMP,
    warmup_day INTEGER DEFAULT 0,
    daily_limit INTEGER NOT NULL DEFAULT 20,
    sent_today INTEGER NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMP,
    delivery_rate INTEGER DEFAULT 100,
    bounce_rate INTEGER DEFAULT 0,
    reply_rate INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX email_accounts_org_idx ON email_accounts(organization_id);

-- LinkedIn accounts table
CREATE TABLE linkedin_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    password TEXT NOT NULL,
    session_cookie TEXT,
    profile_url VARCHAR(500),
    profile_name VARCHAR(255),
    status linkedin_account_status NOT NULL DEFAULT 'active',
    connections_today INTEGER NOT NULL DEFAULT 0,
    messages_today INTEGER NOT NULL DEFAULT 0,
    profile_views_today INTEGER NOT NULL DEFAULT 0,
    daily_connection_limit INTEGER NOT NULL DEFAULT 50,
    daily_message_limit INTEGER NOT NULL DEFAULT 100,
    proxy_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX linkedin_accounts_org_idx ON linkedin_accounts(organization_id);

-- Contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    full_name VARCHAR(500),
    company VARCHAR(255),
    job_title VARCHAR(255),
    industry VARCHAR(255),
    location VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    linkedin_headline TEXT,
    linkedin_summary TEXT,
    website VARCHAR(500),
    status contact_status NOT NULL DEFAULT 'new',
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_unsubscribed BOOLEAN NOT NULL DEFAULT false,
    unsubscribed_at TIMESTAMP,
    total_emails_sent INTEGER NOT NULL DEFAULT 0,
    total_emails_opened INTEGER NOT NULL DEFAULT 0,
    total_emails_clicked INTEGER NOT NULL DEFAULT 0,
    last_contacted_at TIMESTAMP,
    last_replied_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX contacts_org_idx ON contacts(organization_id);
CREATE INDEX contacts_email_idx ON contacts(email);
CREATE INDEX contacts_company_idx ON contacts(company);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    channel campaign_channel NOT NULL,
    status campaign_status NOT NULL DEFAULT 'draft',
    settings JSONB DEFAULT '{}'::jsonb,
    total_contacts INTEGER NOT NULL DEFAULT 0,
    active_contacts INTEGER NOT NULL DEFAULT 0,
    sent INTEGER NOT NULL DEFAULT 0,
    opened INTEGER NOT NULL DEFAULT 0,
    clicked INTEGER NOT NULL DEFAULT 0,
    replied INTEGER NOT NULL DEFAULT 0,
    bounced INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    paused_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX campaigns_org_idx ON campaigns(organization_id);
CREATE INDEX campaigns_status_idx ON campaigns(status);

-- Campaign steps table
CREATE TABLE campaign_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type campaign_channel NOT NULL,
    delay_days INTEGER NOT NULL DEFAULT 0,
    delay_hours INTEGER NOT NULL DEFAULT 0,
    subject VARCHAR(500),
    body_html TEXT,
    body_text TEXT,
    linkedin_message TEXT,
    sent INTEGER NOT NULL DEFAULT 0,
    opened INTEGER NOT NULL DEFAULT 0,
    clicked INTEGER NOT NULL DEFAULT 0,
    replied INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX campaign_steps_campaign_idx ON campaign_steps(campaign_id);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    campaign_id UUID REFERENCES campaigns(id),
    step_id UUID REFERENCES campaign_steps(id),
    contact_id UUID REFERENCES contacts(id),
    email_account_id UUID REFERENCES email_accounts(id),
    message_id VARCHAR(500),
    tracking_id VARCHAR(100) UNIQUE,
    thread_id VARCHAR(255),
    subject VARCHAR(500),
    body_html TEXT,
    body_text TEXT,
    status message_status NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP,
    bounced_at TIMESTAMP,
    opens_count INTEGER NOT NULL DEFAULT 0,
    clicks_count INTEGER NOT NULL DEFAULT 0,
    clicked_links TEXT[],
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_org_idx ON messages(organization_id);
CREATE INDEX messages_campaign_idx ON messages(campaign_id);
CREATE INDEX messages_contact_idx ON messages(contact_id);
CREATE INDEX messages_status_idx ON messages(status);
CREATE INDEX messages_tracking_idx ON messages(tracking_id);

-- Campaign contacts junction table
CREATE TABLE campaign_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, contact_id)
);

CREATE INDEX campaign_contacts_campaign_idx ON campaign_contacts(campaign_id);
CREATE INDEX campaign_contacts_contact_idx ON campaign_contacts(contact_id);

-- Templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subject VARCHAR(500),
    body_html TEXT,
    body_text TEXT,
    linkedin_message TEXT,
    variables TEXT[],
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX templates_org_idx ON templates(organization_id);

-- LinkedIn actions table
CREATE TABLE linkedin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    linkedin_account_id UUID NOT NULL REFERENCES linkedin_accounts(id),
    contact_id UUID REFERENCES contacts(id),
    action_type VARCHAR(50) NOT NULL,
    target_url VARCHAR(500),
    note TEXT,
    message TEXT,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX linkedin_actions_org_idx ON linkedin_actions(organization_id);
CREATE INDEX linkedin_actions_account_idx ON linkedin_actions(linkedin_account_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON email_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_linkedin_accounts_updated_at BEFORE UPDATE ON linkedin_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_steps_updated_at BEFORE UPDATE ON campaign_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_contacts_updated_at BEFORE UPDATE ON campaign_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_linkedin_actions_updated_at BEFORE UPDATE ON linkedin_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
