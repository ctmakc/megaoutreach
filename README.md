# Outreach AI

AI-powered multi-channel outreach automation platform with email and LinkedIn integration.

## Features

- Multi-channel outreach (Email + LinkedIn)
- AI-powered response generation
- Smart email warmup
- Campaign automation with conditions
- Contact enrichment
- Real-time analytics
- Queue-based processing with BullMQ
- Docker deployment ready

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- BullMQ (job queue)
- PostgreSQL (database)
- Redis (cache + queue)
- Puppeteer (LinkedIn automation)

### Frontend
- React + TypeScript
- Vite
- React Router

### Infrastructure
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Nginx

## Project Structure

```
outreach-ai/
├── backend/              # Backend API and services
│   ├── src/
│   │   ├── api/         # API routes and middleware
│   │   ├── services/    # Business logic services
│   │   ├── db/          # Database schema and migrations
│   │   ├── queue/       # Queue workers and jobs
│   │   └── utils/       # Utility functions
├── frontend/            # React frontend
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── hooks/       # Custom React hooks
│       └── api/         # API client
├── docker/              # Docker configurations
└── .github/             # CI/CD workflows
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd megaoutreach
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with required API keys and credentials.

### Development

#### Using Docker Compose (Recommended)

```bash
docker-compose up
```

This will start:
- Backend API on http://localhost:3000
- Frontend on http://localhost:80
- PostgreSQL on localhost:5432
- Redis on localhost:6379

#### Manual Setup

1. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. Start services:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Worker
cd backend
npm run worker:dev

# Terminal 3 - Frontend
cd frontend
npm run dev
```

## Environment Variables

See [.env.example](.env.example) for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - Secret for JWT authentication
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `HUNTER_API_KEY` - Hunter.io API key for email enrichment

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `POST /api/contacts/import` - Import contacts from CSV

### Email
- `POST /api/email/send` - Send email
- `GET /api/email/inbox` - Get inbox messages
- `POST /api/email/accounts` - Add email account

### LinkedIn
- `POST /api/linkedin/connect` - Send connection request
- `POST /api/linkedin/message` - Send LinkedIn message
- `GET /api/linkedin/profile/:username` - Get LinkedIn profile

### Analytics
- `GET /api/analytics/campaigns/:id` - Campaign analytics
- `GET /api/analytics/dashboard` - Dashboard overview

## Deployment

### Production Deployment with Docker

1. Build and push images:
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml push
```

2. On production server:
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Automated Deployment

The project includes GitHub Actions workflow for automatic deployment on push to main branch.

Configure these secrets in your GitHub repository:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SERVER_HOST`
- `SERVER_USERNAME`
- `SERVER_SSH_KEY`

## Development Roadmap

- [ ] Complete authentication system with JWT
- [ ] Implement email sending with SMTP
- [ ] Build LinkedIn automation with Puppeteer
- [ ] Add AI response generation
- [ ] Create campaign execution engine
- [ ] Implement email warmup strategy
- [ ] Add contact enrichment services
- [ ] Build analytics dashboard
- [ ] Create frontend UI components
- [ ] Add webhook support for real-time updates
- [ ] Implement A/B testing for campaigns

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For questions and support, please open an issue in the GitHub repository.
