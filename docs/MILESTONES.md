# Simply Platform - Milestone Plan

## Overview

Each milestone delivers working, tested code with clear run instructions. Dependencies between milestones are minimized to allow parallel work where possible.

---

## Milestone 1: Foundation & Authentication

### Scope
- Project setup (Next.js, TypeScript, Tailwind, Prisma)
- Database schema (core tables)
- Authentication (magic link + optional password)
- Shopify webhook integration
- Basic dashboard layout
- Admin user management

### Deliverables

```
✅ Project structure
   ├── next.config.js
   ├── tailwind.config.js
   ├── prisma/schema.prisma
   └── src/
       ├── app/
       │   ├── (auth)/
       │   │   ├── login/
       │   │   └── verify/
       │   ├── (dashboard)/
       │   │   ├── layout.tsx (sidebar nav)
       │   │   └── page.tsx (dashboard)
       │   └── api/
       │       ├── auth/
       │       │   ├── magic-link/
       │       │   └── session/
       │       └── webhooks/
       │           └── shopify/
       ├── components/
       │   ├── ui/ (buttons, inputs, cards)
       │   └── layout/ (sidebar, header)
       └── lib/
           ├── db.ts
           ├── auth.ts
           └── shopify.ts

✅ Database tables
   - User, VerificationToken, AuthSession
   - ShopifyProductMapping
   - AuditLog, FeatureFlag

✅ Features
   - Login page with email input
   - Magic link email sending
   - Token verification and session creation
   - Shopify webhook receiver (order.paid)
   - User provisioning from Shopify
   - Dashboard with sidebar navigation
   - Admin: user list view
```

### Acceptance Criteria
- [ ] User can request magic link, receive email, click to log in
- [ ] Session persists for 30 days
- [ ] Shopify webhook creates user + enrollment
- [ ] Dashboard shows welcome message
- [ ] Admin can view all users
- [ ] Responsive on mobile

### Run Instructions
```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Start database (Docker)
docker-compose up -d postgres

# 4. Run migrations
pnpm prisma migrate dev

# 5. Seed demo data
pnpm prisma db seed

# 6. Start dev server
pnpm dev

# Open http://localhost:3000
```

---

## Milestone 2: Courses & Progress

### Scope
- Course, Module, Lesson models
- Course listing and detail pages
- Lesson viewer (text + video)
- Progress tracking (completion)
- Loom embed support
- Video upload (Mux integration)
- Time-bound access & dripping
- Course duplication (admin)

### Deliverables

```
✅ Pages
   ├── /courses (list enrolled courses)
   ├── /courses/[slug] (course detail, modules)
   └── /courses/[slug]/[lessonId] (lesson viewer)

✅ Admin pages
   ├── /admin/courses (list all)
   ├── /admin/courses/new
   ├── /admin/courses/[id]/edit
   └── /admin/courses/[id]/duplicate

✅ Components
   ├── CourseCard
   ├── ModuleList
   ├── LessonViewer
   ├── VideoPlayer (Loom + Mux)
   └── ProgressBar

✅ API routes
   ├── /api/courses
   ├── /api/courses/[id]/progress
   └── /api/admin/courses/[id]/duplicate
```

### Acceptance Criteria
- [ ] Client sees only enrolled courses
- [ ] Progress bar shows % completion
- [ ] Lessons can be marked complete
- [ ] Loom videos embed correctly
- [ ] Uploaded videos play via Mux
- [ ] Locked content shows unlock date
- [ ] Admin can duplicate course

### Database Additions
- Course, Module, Lesson
- LessonAttachment
- Enrollment, Progress

---

## Milestone 3: Community & Messaging

### Scope
- Community spaces
- Posts and comments
- Post likes
- Direct messages (DMs)
- Real-time updates (Pusher)
- Host-only announcement spaces
- Space access control

### Deliverables

```
✅ Pages
   ├── /community (space list + feed)
   ├── /community/[spaceSlug] (space feed)
   ├── /community/post/[id] (single post + comments)
   └── /messages (DM inbox + chat)

✅ Admin pages
   ├── /admin/community/spaces
   └── /admin/community/spaces/[id] (edit, members)

✅ Components
   ├── SpaceList
   ├── PostCard
   ├── CommentThread
   ├── PostComposer
   ├── ConversationList
   └── ChatWindow

✅ Real-time
   ├── New post notifications
   ├── New message notifications
   └── Typing indicators (optional)
```

### Acceptance Criteria
- [ ] Client sees only accessible spaces
- [ ] Can create posts with images
- [ ] Comments thread under posts
- [ ] Likes work
- [ ] DMs are real-time
- [ ] Host-only spaces hide reply for clients
- [ ] Admin can lock/unlock space access per user

### Database Additions
- Space, SpaceMember
- Post, PostAttachment, PostLike
- Comment
- Conversation, ConversationParticipant, Message

---

## Milestone 4: Coaching Sessions

### Scope
- Session scheduling
- Session list view (client + coach)
- Video room (Daily.co)
- ICS calendar download
- Session notes (coach)

### Deliverables

```
✅ Pages
   ├── /coaching (upcoming + past sessions)
   ├── /coaching/[id] (session detail)
   └── /coaching/[id]/room (video room)

✅ Admin/Coach pages
   ├── /admin/sessions (all sessions)
   └── /admin/sessions/new (schedule)

✅ Components
   ├── SessionCard
   ├── VideoRoom (Daily.co)
   ├── SessionNotes
   └── CalendarButton (ICS download)

✅ API routes
   ├── /api/sessions
   ├── /api/sessions/[id]/calendar
   └── /api/sessions/[id]/room (create Daily room)
```

### Acceptance Criteria
- [ ] Coach can schedule session with client
- [ ] Client sees upcoming sessions on dashboard
- [ ] ICS download adds to calendar
- [ ] Video room works for 1-on-1
- [ ] Coach can add notes after session
- [ ] Notes optionally shared with client

### Database Additions
- Session, SessionNote

---

## Milestone 5: Trackers & Check-ins

### Scope
- Nutrition tracker (kcal + protein)
- Weekly check-ins (weight, measurements, photos)
- Habit tracker (water, steps, supplements)
- Cycle tracking
- Symptom monitoring
- Progress graphs

### Deliverables

```
✅ Pages
   ├── /trackers (overview dashboard)
   ├── /trackers/nutrition
   ├── /trackers/checkins
   ├── /trackers/habits
   ├── /trackers/cycle
   └── /trackers/symptoms

✅ Components
   ├── NutritionLogger
   ├── CheckInForm (with photo upload)
   ├── HabitCheckboxes
   ├── CycleCalendar
   ├── SymptomSliders
   ├── ProgressChart (recharts)
   └── PhotoComparison

✅ Coach view
   └── /admin/clients/[id]/trackers
```

### Acceptance Criteria
- [ ] Daily nutrition logging works
- [ ] Weekly check-in with photo upload
- [ ] Photos stored securely (R2)
- [ ] Graphs show progress over time
- [ ] Habit streaks visible
- [ ] Coach can view client data

### Database Additions
- CheckIn, NutritionLog, HabitLog
- CycleLog, SymptomLog

---

## Milestone 6: Recipes & Meal Planning

### Scope
- Recipe library
- Recipe detail view
- Grocery list
- Meal planning (weekly)
- Personal nutrition plan downloads

### Deliverables

```
✅ Pages
   ├── /recipes (library with filters)
   ├── /recipes/[slug] (recipe detail)
   ├── /recipes/grocery-list
   └── /recipes/meal-plan

✅ Admin pages
   ├── /admin/recipes
   └── /admin/recipes/[id]/edit

✅ Components
   ├── RecipeCard
   ├── RecipeDetail
   ├── IngredientList
   ├── GroceryList (checkable)
   ├── MealPlanGrid
   └── NutritionPlanDownload
```

### Acceptance Criteria
- [ ] Recipe library with search/filter
- [ ] Recipe shows ingredients + steps + macros
- [ ] Can add to grocery list
- [ ] Grocery list is checkable
- [ ] Week view for meal planning
- [ ] Can download personal nutrition plan PDF

### Database Additions
- Recipe
- GroceryList, GroceryItem
- MealPlan, MealPlanItem
- NutritionPlan

---

## Milestone 7: SIX AI & Knowledge Base

### Scope
- AI chat interface
- RAG with pgvector
- Knowledge base management
- Auto-indexing course content
- Safety guardrails
- Feedback (thumbs up/down)
- Daily tip scheduler

### Deliverables

```
✅ Pages
   ├── /six (AI chat interface)
   └── /admin/ai
       ├── knowledge-base (manage sources)
       ├── conversations (view logs)
       └── tips (schedule daily tips)

✅ Components
   ├── AiChatWindow
   ├── AiMessage
   ├── FeedbackButtons
   ├── DailyTipCard
   └── KnowledgeBaseTable

✅ API routes
   ├── /api/ai/chat
   ├── /api/ai/feedback
   └── /api/admin/ai/sources
```

### Acceptance Criteria
- [ ] Chat works with context-aware answers
- [ ] Answers cite sources when relevant
- [ ] Medical questions get disclaimer
- [ ] Feedback saves to database
- [ ] Admin can add/remove KB sources
- [ ] Course content auto-indexed
- [ ] Daily tip shows on dashboard

### Database Additions
- AiConversation, AiMessage
- AiSource (with pgvector)
- AiDailyTip

---

## Milestone 8: WhatsApp & Notifications (V1)

### Scope
- WhatsApp message sending
- Message templates
- Message logs
- In-app notifications
- Push notifications (optional)
- Reminder rules engine

### Deliverables

```
✅ Admin pages
   ├── /admin/whatsapp (send messages)
   └── /admin/whatsapp/logs

✅ Components
   ├── WhatsAppComposer
   ├── MessageLogTable
   ├── NotificationBell
   └── NotificationList

✅ Background jobs
   ├── Check-in reminders
   └── Session reminders
```

### Acceptance Criteria
- [ ] Admin can send WhatsApp to client
- [ ] Message delivery status tracked
- [ ] In-app notification bell works
- [ ] Missed check-in triggers reminder
- [ ] Session reminder 24h before

### Database Additions
- WhatsappMessage
- Notification

---

## Milestone 9: Voice Memos & Polish

### Scope
- Voice memo recording in chat
- Voice memo in posts
- Voice playback
- UI polish and animations
- Performance optimization
- Error handling improvements

### Deliverables

```
✅ Components
   ├── VoiceRecorder
   └── VoicePlayer

✅ Polish
   ├── Loading states
   ├── Error boundaries
   ├── Skeleton loaders
   ├── Animations (framer-motion)
   └── Accessibility audit
```

### Acceptance Criteria
- [ ] Can record voice in DMs
- [ ] Can attach voice to posts
- [ ] Playback works on mobile
- [ ] No layout shift on load
- [ ] Graceful error handling
- [ ] Lighthouse score > 90

---

## Timeline Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        MVP PHASE                               │
├────────────────────────────────────────────────────────────────┤
│ M1: Foundation     │████████████████│                          │
│ M2: Courses        │                │████████████████│         │
│ M3: Community      │                │████████████████│         │
│ M4: Coaching       │                │        │████████████████││
├────────────────────────────────────────────────────────────────┤
│                         V1 PHASE                               │
├────────────────────────────────────────────────────────────────┤
│ M5: Trackers       │████████████████│                          │
│ M6: Recipes        │████████████████│                          │
│ M7: SIX AI         │                │████████████████│         │
│ M8: WhatsApp       │                │████████████████│         │
│ M9: Polish         │                │        │████████████████││
└────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL + Prisma |
| **Vector Search** | pgvector |
| **Auth** | Custom (magic link) |
| **Real-time** | Pusher |
| **Video Hosting** | Mux |
| **Live Video** | Daily.co |
| **Storage** | Cloudflare R2 |
| **Email** | Resend |
| **WhatsApp** | Twilio |
| **AI** | OpenAI GPT-4 |
| **Deployment** | Vercel |

---

## Definition of Done (per milestone)

- [ ] All features from scope implemented
- [ ] Database migrations applied
- [ ] Seed data for testing
- [ ] API routes with validation
- [ ] UI components styled per design system
- [ ] Responsive on mobile
- [ ] Basic error handling
- [ ] Key flows tested
- [ ] Run instructions updated
- [ ] No TypeScript errors
- [ ] No console errors
