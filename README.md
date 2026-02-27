# Simply Platform

Online leer- en communityplatform voor Simply in Balance klanten.

## Features

- 📚 **Cursussen** - Programma's met modules en lessen (Kajabi-style)
- 👥 **Community** - Spaces, posts, DMs (Circle-style)
- ⏱️ **Tijdsgebonden toegang** - Challenges met start/einddatum (Huddle-style)
- 📊 **Trackers** - Voeding, check-ins, habits, cyclus, symptomen
- 🍽️ **Recepten** - Receptenbibliotheek met weekmenu's
- 🤖 **SIX AI** - AI assistent getraind op jouw content
- 📅 **Coaching** - Video sessies met agenda-integratie
- 💬 **WhatsApp** - Berichten sturen naar klanten

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma
- **Auth**: Custom magic link authentication
- **Real-time**: Pusher (later milestones)
- **AI**: OpenAI GPT-4 with RAG (pgvector)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Docker (for PostgreSQL)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd "Simply app"
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your values (see below for required vars).

3. **Start the database**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

5. **Seed demo data**
   ```bash
   pnpm db:seed
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

After seeding, you can log in with these email addresses:

| Role | Email |
|------|-------|
| Admin | admin@simplyinbalance.com |
| Coach | coach@simplyinbalance.com |
| Client | demo@example.com |

Use the magic link login. In development, check the console for the magic link URL (or configure Resend for actual emails).

### Environment Variables

**Required for MVP:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/simply"
AUTH_SECRET="generate-a-random-32-char-string"
APP_URL="http://localhost:3000"
```

**For email (optional in dev, required for prod):**
```env
RESEND_API_KEY="re_your_key"
EMAIL_FROM="Simply <noreply@simplyinbalance.com>"
```

**For Shopify integration:**
```env
SHOPIFY_WEBHOOK_SECRET="your-webhook-secret"
```

**For Coaching Sessions (Milestone 4):**
```env
DAILY_API_KEY="your-daily-api-key"
```

Get your Daily.co API key from [https://dashboard.daily.co](https://dashboard.daily.co). The free tier includes 10,000 minutes/month.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, verify pages
│   ├── (dashboard)/      # Protected pages (requires login)
│   │   ├── page.tsx      # Dashboard
│   │   ├── courses/      # Course pages
│   │   ├── community/    # Community pages
│   │   ├── messages/     # DM pages
│   │   ├── coaching/     # Coaching pages
│   │   ├── trackers/     # Tracker pages
│   │   ├── recipes/      # Recipe pages
│   │   ├── six/          # AI chat
│   │   └── admin/        # Admin pages
│   └── api/              # API routes
│       ├── auth/         # Auth endpoints
│       └── webhooks/     # Webhook handlers
├── components/
│   ├── ui/               # Base UI components
│   └── layout/           # Layout components
├── lib/
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # Auth utilities
│   ├── email.ts          # Email sending
│   └── utils.ts          # Helper functions
└── prisma/
    ├── schema.prisma     # Database schema
    └── seed.ts           # Seed data
```

## Development Commands

```bash
# Start dev server
pnpm dev

# Run database migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Open Prisma Studio (database GUI)
pnpm db:studio

# Seed database
pnpm db:seed

# Build for production
pnpm build

# Start production server
pnpm start
```

## Milestone Progress

- [x] **M1**: Foundation & Authentication
- [x] **M2**: Courses & Progress
- [x] **M3**: Community & Messaging
- [x] **M4**: Coaching Sessions
- [x] **M5**: Trackers & Check-ins
- [x] **M6**: Recipes & Meal Planning
- [ ] **M7**: SIX AI & Knowledge Base
- [ ] **M8**: WhatsApp & Notifications
- [ ] **M9**: Voice Memos & Polish

## Documentation

See the `/docs` folder for detailed documentation:

- [PRD.md](docs/PRD.md) - Product Requirements
- [UX-ARCHITECTURE.md](docs/UX-ARCHITECTURE.md) - UX & Navigation
- [DATA-MODEL.md](docs/DATA-MODEL.md) - Database Schema
- [INTEGRATIONS.md](docs/INTEGRATIONS.md) - External Services
- [SECURITY.md](docs/SECURITY.md) - Security & RBAC
- [MILESTONES.md](docs/MILESTONES.md) - Development Plan

## License

Private - Simply in Balance
