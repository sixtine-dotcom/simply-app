# Simply Platform

Online leer- en communityplatform voor Simply in Balance klanten.

Status note: this README is a lightweight project overview, not the detailed current state source of truth.

For the up-to-date implementation picture, start with:
- `docs/README.md`
- `docs/FEATURE-INVENTORY.md`
- `docs/DESKTOP-IMPLEMENTATION-STATUS.md`

## Features

- 📚 **Cursussen** - Programma's met modules en lessen (Kajabi-style)
- 👥 **Community** - Spaces, posts, DMs (Circle-style)
- ⏱️ **Tijdsgebonden toegang** - Challenges met start/einddatum (Huddle-style)
- 📊 **Trackers** - Voeding, check-ins, habits, cyclus, symptomen
- 🍽️ **Recepten** - Receptenbibliotheek met weekmenu's
- 🤖 **SIX AI** - AI assistent getraind op jouw content
- 📅 **Coaching** - Video sessies met agenda-integratie
- 💬 **WhatsApp** - Berichten sturen naar klanten
- 🏢 **Platform / tenants** - SuperAdmin control plane, tenant branding, billing, and onboarding
- 📝 **Forms** - Toewijsbare intake-, onboarding- en check-informulieren
- 💳 **Billing** - Tenant planbeheer, Stripe subscription state en dunning flows

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
│   ├── (auth)/           # Login, register, sign-up flows
│   ├── (dashboard)/      # Member + tenant admin product shell
│   │   ├── admin/        # Tenant admin workspace
│   │   ├── forms/        # Member-facing forms
│   │   ├── trackers/     # Trackers and progress
│   │   └── ...           # Courses, community, messages, coaching, recipes, etc.
│   ├── (platform)/       # SuperAdmin control plane
│   └── api/              # Auth, admin, platform, webhooks, cron, uploads
├── components/
│   ├── ui/               # Base UI components
│   ├── layout/           # Shared app shell components
│   └── admin/            # Admin-focused UI pieces
├── hooks/                # Shared client hooks
├── lib/
│   ├── auth.ts           # Auth, sessions, impersonation, audit helpers
│   ├── tenant.ts         # Tenant resolution helpers
│   ├── billing.ts        # Plan and subscription logic
│   ├── forms.ts          # Forms and assignments logic
│   └── ...               # Branding, community, courses, messaging, etc.
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── docs/
    ├── README.md         # Documentation guide
    └── ...               # Product, architecture, status, and setup docs
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

## Roadmap Note

The older milestone framing in this README is no longer the best way to read project progress.
Use these instead:
- `docs/DESKTOP-IMPLEMENTATION-PLAN.md` for intended platform/desktop roadmap
- `docs/DESKTOP-IMPLEMENTATION-STATUS.md` for audited current progress

## Documentation

See the `/docs` folder for detailed documentation:

- [docs/README.md](docs/README.md) - Documentation guide and reading order
- [SETUP.md](SETUP.md) - Local setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide

Current state docs:
- [FEATURE-INVENTORY.md](docs/FEATURE-INVENTORY.md) - Current shipped surface
- [DESKTOP-IMPLEMENTATION-STATUS.md](docs/DESKTOP-IMPLEMENTATION-STATUS.md) - Current implementation audit
- [DASHBOARD-CONTEXTS.md](docs/DASHBOARD-CONTEXTS.md) - Shared dashboard shell context rules
- [INTEGRATIONS.md](docs/INTEGRATIONS.md) - Integration status and design

Mixed or historical docs:
- [DESKTOP-IMPLEMENTATION-PLAN.md](docs/DESKTOP-IMPLEMENTATION-PLAN.md) - Desktop/platform target roadmap
- [PRD.md](docs/PRD.md) - Earlier product requirements framing
- [UX-ARCHITECTURE.md](docs/UX-ARCHITECTURE.md) - UX reference with historical wireframes
- [DATA-MODEL.md](docs/DATA-MODEL.md) - Schema reference with current state deltas
- [SECURITY.md](docs/SECURITY.md) - Security intent plus current state notes
- [MILESTONES.md](docs/MILESTONES.md) - Original delivery plan

## License

Private - Simply in Balance
