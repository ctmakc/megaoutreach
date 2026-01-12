# Terminology Guide - Personal Outreach Focus

This document outlines the terminology used in MegaOutreach to emphasize **personal, one-on-one communication** rather than mass marketing.

## Key Principles

1. **This is NOT a mass mailing tool** - it's a personal outreach platform
2. **Every message should feel hand-crafted** - even if AI-assisted
3. **Focus on relationships** - not broadcasts
4. **Quality over quantity** - meaningful conversations matter

## Recommended Terms

### ✅ USE (Personal & Authentic)

- **Outreach Sequence** (not "campaign" or "blast")
- **Follow-up** (not "drip email")
- **Personal message** (not "mass email")
- **Conversation** (not "thread")
- **Reach out to** (not "send to")
- **Connect with** (not "target")
- **Prospect** or **Lead** (not "subscriber")
- **Reply rate** (not "engagement rate")
- **Message templates** (not "email templates")
- **Opt-out preference** (not "unsubscribe")
- **Email warmup** → **Account preparation**
- **Daily sending limit** → **Daily outreach capacity**

### ❌ AVOID (Mass Marketing Terms)

- ~~Campaign~~ → Use "Outreach Sequence" or "Follow-up Series"
- ~~Blast~~ → Use "Send"
- ~~Bulk send~~ → Use "Send to multiple prospects"
- ~~Newsletter~~ → Use "Update" or "Message"
- ~~Subscribers~~ → Use "Contacts" or "Prospects"
- ~~Unsubscribe~~ → Use "Opt-out" or "Stop receiving messages"
- ~~Mass email~~ → Use "Personalized outreach"
- ~~Broadcast~~ → Use "Share with"
- ~~Segment~~ → Use "Group" or "Filter"

## UI/UX Language

### Email Sending

**Instead of:**
- "Send mass email to 500 contacts"
- "Schedule campaign for tomorrow"
- "Blast this message"

**Use:**
- "Send personalized message to 50 prospects"
- "Schedule outreach sequence"
- "Reach out to selected contacts"

### LinkedIn

**Instead of:**
- "Mass connection requests"
- "Automated messaging"

**Use:**
- "Send connection requests with personal notes"
- "Follow-up messages with personalization"

### Analytics

**Instead of:**
- "Campaign performance"
- "Open rate"
- "Click-through rate"

**Use:**
- "Outreach results"
- "Message views"
- "Link engagement"
- "Reply rate" (this is acceptable)

### Unsubscribe/Opt-out

**Instead of:**
- "Unsubscribe from mailing list"
- "Remove from campaign"

**Use:**
- "Update email preferences"
- "Stop receiving messages from this sender"
- "Opt out of future outreach"

## Code Variable Naming

While backend code uses `campaigns`, `messages`, etc., the **frontend UI** should display user-friendly terms:

```typescript
// Backend: campaign
// Frontend display: "Outreach Sequence" or "Follow-up Series"

// Backend: unsubscribe
// Frontend display: "Opt out" or "Email preferences"

// Backend: broadcast
// Frontend display: "Send to multiple"
```

## Email Footer Best Practices

**Bad (looks like mass marketing):**
```
You're receiving this because you subscribed to our mailing list.
Unsubscribe | Update Preferences | Manage Subscription
```

**Good (personal outreach):**
```
Best regards,
[Your Name]

If you'd prefer not to receive future emails from me, please let me know or click here.
```

## Template Examples

### Connection Request (LinkedIn)

**Bad:**
```
Hi {firstName},

I'm reaching out to all {jobTitle}s in {industry} about...
```

**Good:**
```
Hi {firstName},

I noticed your work at {company} and thought you might find this relevant...

[Specific, personal reason for reaching out]
```

### Follow-up Email

**Bad:**
```
This is automated follow-up #3 in our nurture sequence...
```

**Good:**
```
Hi {firstName},

Following up on my last email about [specific topic].

Just wanted to check if this would be valuable for {company}?
```

## Implementation Checklist

- [ ] Update all frontend UI text to use personal terminology
- [ ] Remove words like "campaign", "blast", "mass" from user-facing text
- [ ] Change "Campaigns" page to "Outreach" or "Sequences"
- [ ] Update email footers to feel personal
- [ ] Remove "unsubscribe" → use "opt-out preferences"
- [ ] Add warnings when sending to >50 people at once
- [ ] Emphasize personalization features in UI
- [ ] Show "personalization score" for each message

---

**Remember:** The goal is to help sales reps send **thoughtful, personalized messages** at scale, not to spam people with mass marketing emails.
