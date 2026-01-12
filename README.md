# MegaOutreach - Personal B2B Outreach Platform

> Personalized email and LinkedIn outreach with AI-powered personalization

**Not a mass mailing tool** - MegaOutreach helps sales teams send authentic, one-on-one messages that feel personal, not automated.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- OR Node.js 20+ and PostgreSQL 15+ for local development

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd megaoutreach

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# Minimum required: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, GOOGLE_CLIENT_ID/SECRET
```

### 2. Start with Docker

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/docs (when available)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📝 Environment Setup

### Required Variables

```env
# Database
DATABASE_URL=postgresql://megaoutreach:password@localhost:5432/megaoutreach

# Security
JWT_SECRET=your-secret-min-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key

# Google OAuth (for authentication)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Application
BACKEND_URL=http://localhost:4000
```

### Optional Variables (Configure via Settings UI)

All API keys can be added through **Settings > API** in the web interface:

- OpenAI API Key (AI content generation)
- Anthropic Claude API Key (alternative AI)
- Hunter.io API Key (email finding)
- Clearbit API Key (contact enrichment)

## 🏗️ Project Structure

```
megaoutreach/
├── backend/              # Node.js/Fastify API
│   ├── src/
│   │   ├── api/         # Routes & middleware
│   │   │   ├── routes/  # API endpoints
│   │   │   └── middleware/ # Auth, rate limiting
│   │   ├── db/          # Database
│   │   │   ├── schema.ts   # Drizzle ORM schema
│   │   │   └── migrations/ # SQL migrations
│   │   ├── services/    # Business logic
│   │   │   ├── email/   # Email sending & tracking
│   │   │   ├── linkedin/ # LinkedIn automation
│   │   │   ├── ai/      # AI content generation
│   │   │   └── campaign/ # Campaign engine
│   │   └── utils/       # Utilities
│   └── package.json
│
├── frontend/            # React/Vite SPA
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   │   ├── auth/   # Login, register
│   │   │   ├── settings/ # Settings pages
│   │   │   └── ...     # Other pages
│   │   ├── contexts/   # React contexts
│   │   ├── lib/        # API client
│   │   └── main.tsx    # Entry point
│   └── package.json
│
├── docker/             # Dockerfiles
├── nginx/              # Nginx config
├── .env.example        # Environment template
└── docker-compose.yml  # Dev environment
```

## 🔑 Key Features

### ✅ Fully Implemented

- **Personal Outreach Sequences** - Multi-step follow-ups (not mass campaigns)
- **Email Account Management** - SMTP/IMAP with warmup support
- **LinkedIn Automation** - Playwright-based with stealth mode
- **AI Content Generation** - OpenAI & Anthropic Claude integration
- **Email Tracking** - Opens, clicks, replies tracking
- **Contact Management** - Import, enrich, segment contacts
- **Team Collaboration** - Role-based access (Owner, Admin, Manager, Member)
- **Template System** - Reusable templates with variables
- **Analytics Dashboard** - Real-time outreach metrics
- **Integrations** - CRM, enrichment, AI services
- **Dark Mode** - Full dark/light theme support

### 🎯 Philosophy

MegaOutreach is designed for **quality over quantity**:
- Every message should feel personal
- No "batch sending" or "blasting"
- AI assists personalization, not automation
- 1-to-1 relationships, not broadcasts

See [TERMINOLOGY.md](./TERMINOLOGY.md) for our naming conventions.

## 🛠️ Development

### Backend Development

```bash
cd backend
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run migrations
npm run migrate
```

### Frontend Development

```bash
cd frontend
npm install

# Development mode (with HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Migrations

```bash
cd backend

# Run all pending migrations
npm run migrate

# Create new migration
npm run migrate:create -- -m "add_new_field"

# Rollback last migration
npm run migrate:rollback
```

## 🎨 Settings Pages

All credentials are configured through the web UI (no manual .env editing):

### Settings > API
Configure API keys for:
- OpenAI (AI content generation)
- Anthropic Claude (alternative AI)
- Hunter.io (email finding)
- Clearbit (contact enrichment)
- Google OAuth (authentication)

### Settings > Accounts
- Add email accounts (SMTP/IMAP)
- Connect LinkedIn accounts
- View account status and limits
- Monitor delivery rates

### Settings > Team
- Invite team members
- Manage roles and permissions
- View team activity

### Settings > Integrations
- Connect CRMs (HubSpot, Salesforce)
- Enable enrichment services
- Set up analytics tracking
- Connect Zapier/Make

## 📚 Documentation

- **[SETUP-COMPLETE.md](./SETUP-COMPLETE.md)** - Detailed setup guide
- **[TERMINOLOGY.md](./TERMINOLOGY.md)** - Naming conventions for personal outreach
- **API Docs** - Available at `/docs` when backend is running

## 🔐 Security

- All sensitive data encrypted at rest using AES-256
- JWT authentication with refresh tokens
- Rate limiting on all API endpoints
- CORS configured for production
- SQL injection protection via Drizzle ORM
- XSS protection with sanitization

**Important**: Always change default secrets in production!

## 🚢 Deployment

### Production Build

```bash
# Build and start production services
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# View production logs
docker compose -f docker-compose.prod.yml logs -f
```

### Production Checklist

- [ ] Set strong JWT_SECRET (min 32 chars)
- [ ] Set strong ENCRYPTION_KEY (exactly 32 chars)
- [ ] Configure real DATABASE_URL
- [ ] Set BACKEND_URL to production domain
- [ ] Configure Google OAuth with production redirect URI
- [ ] Add API keys via Settings UI
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring and alerts

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
# On Windows:
netstat -ano | findstr :4000

# On Linux/Mac:
lsof -i :4000

# Change port in .env if needed
PORT=5000
```

### Database Connection Issues

```bash
# Check if PostgreSQL container is running
docker compose ps

# View database logs
docker compose logs postgres

# Connect to database manually
docker compose exec postgres psql -U megaoutreach -d megaoutreach
```

### Playwright Browser Issues

LinkedIn automation requires Playwright browsers:

```bash
cd backend
npx playwright install chromium
```

### Frontend Build Errors

```bash
cd frontend

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

## 📊 Tech Stack

### Backend
- **Fastify** - Fast, low-overhead web framework
- **Drizzle ORM** - Type-safe SQL ORM
- **PostgreSQL 15** - Relational database
- **Redis 7** - Caching and job queues
- **BullMQ** - Background job processing
- **Playwright** - LinkedIn browser automation
- **Nodemailer** - SMTP email sending
- **OpenAI/Anthropic** - AI content generation

### Frontend
- **React 18** - UI library
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS
- **React Query** - Server state management
- **React Router** - Client-side routing
- **Lucide Icons** - Beautiful icon set
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy (production)
- **GitHub Actions** - CI/CD

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Open an issue on GitHub
- **Documentation**: Check [SETUP-COMPLETE.md](./SETUP-COMPLETE.md)
- **Terminology**: See [TERMINOLOGY.md](./TERMINOLOGY.md)

---

**Made with ❤️ for B2B sales teams who value authentic relationships over mass marketing**
