# Simply Platform - Feature Inventory

Last updated: March 19, 2026  
Source: audited from `src/app`, `src/app/api`, `src/lib`, and `prisma/schema.prisma`.

## 1) Client-facing features (live)

### Authentication & account
- Clerk sign-in and sign-up flow (`/login`, `/sign-up`).
- Custom registration flow with token verification (`/register`, `/register/complete`, `/verify` + auth API routes).
- Session handling with user auto-provisioning in database.
- Impersonation session support exists for SuperAdmin platform flows.

### Dashboard & navigation
- Personalized dashboard with:
- active course progress
- upcoming coaching preview
- daily tracker snapshot (water/protein/supplements)
- weekly check-in reminder
- community shortcuts
- SIX AI shortcut
- Responsive sidebar + mobile nav.
- Shared dashboard context/providers for current user and tenant branding.

### Courses
- Course overview with active/expired access states.
- Time-bound enrollment support (start/end dates, unlimited access).
- Course detail with module/lesson progression.
- Drip/locked content states with unlock dates.
- Lesson pages with:
- video player (Loom/upload)
- rich text content
- attachments/downloads
- mark as complete
- previous/next navigation
- Progress tracking per lesson and per course.
- Course-specific “Coachings & opnames” page (recorded sessions playback).

### Community
- Space-based community feed.
- Space access control (public/private/host-only behavior in UI).
- Post composer.
- Post detail page with:
- likes
- comments
- attachments (image/voice memo rendering)

### Messages (DMs)
- Conversation list with unread counts.
- New conversation creation.
- 1:1 chat thread page with message input and historical messages.

### Coaching
- Coaching overview (upcoming + completed sessions).
- Session detail page with participant info, timing, and notes visibility rules.
- Join window logic for video calls.
- In-app video room loading for session participants.
- ICS calendar download for scheduled sessions.

### Trackers (“Mijn Omgeving”)
- Tracker overview dashboard.
- Nutrition tracker (kcal/macros logs).
- Weekly check-ins (weight/measurements/notes).
- Habits tracker (water/steps/supplements/etc.).
- Cycle tracker.
- Symptom tracker.
- Progress charts page (nutrition/check-ins/symptoms).
- Progress photos flow per course/moment (upload/update/remove).
- Weekly overview page with generated highlights and downloadable social image.

### Recipes & meal planning
- Recipe library with filtering/search.
- Recipe detail pages with ingredients, instructions, nutrition info, tags.
- Add recipe to grocery list.
- Grocery list generation from selected recipes + item check-off.
- Weekly meal planner (assign/remove recipe by day + meal type).
- Nutrition plan download page (if plan exists).

### Producten & kennisbank
- Client page for:
- category-based knowledge videos
- favorite products with discount codes/links

### Forms
- Member-facing forms overview page.
- Assigned form detail/runner page.
- Support for required forms, due dates, submitted-state display, and admin preview mode.
- Assignment targeting by role/course/community/user exists in the data model and admin tooling.

### Notifications
- Notifications center page.
- Mark-as-read behavior.
- Session reminders and weekly summary notifications display.

### Settings/Profile
- Profile editing (name, phone, bio).
- Avatar upload via upload API.
- Account info display.

### Public landing pages
- Published landing pages at `/landing/[slug]`.
- Block-based rendering:
- headings/text/images
- Loom/Vimeo video
- Shopify product block with checkout link
- Calendly embed
- CTA buttons

## 2) Admin/backoffice features (live)

### Admin dashboard
- Platform metrics (users, clients, courses, enrollments, completed progress).

### Admin onboarding
- Guided onboarding dashboard with readiness/progress tracking.
- Quick-start flows for creating initial course, member, community, landing page, and offer assets.
- Launch-readiness and pending-activation signals.

### User management
- User list with role, enrollments, progress count, and activity info.
- Add user form.
- CSV import for users.
- Bulk invite pending users action.

### Course management
- Course listing + status/visibility insights.
- Create/edit course.
- Duplicate course.
- JSON course import.
- Module and lesson management.
- Lesson attachment management.
- Enrollment management per course.
- Shopify mapping per course.
- Course-linked progress photo schedule support.

### Session management
- Session overview for admin/coach.
- Create one-to-one session.
- Create recurring group session.

### Community management
- Community space overview with stats.
- Create new space.
- Community space detail/edit page exists.

### Recipe management
- Recipe overview for admin.
- Recipe import flow.
- New recipe page route now exists.

### Producten/kennisbank management
- CRUD for knowledge categories.
- CRUD for knowledge videos within categories.
- CRUD for favorite products.

### Forms management
- Forms overview with assignment/response counts and pending required tracking.
- Form builder/detail page with questions, assignments, and recent responses.
- Required-form reminder action for pending users.

### Offers & access
- Offer management UI for one-time, subscription, and payment-plan offers.
- Link offers to one or more courses.
- Manual user assignment flow for granting offer access.
- Lead capture and lead status handling for published offers.
- Offer conversion path that grants enrollments/access internally.

### Billing
- Tenant billing page for subscription/trial state.
- Plan selection for Starter/Pro/Enterprise.
- Cancellation/resume flows.
- Dunning state visibility for past-due subscriptions.

### Branding
- Tenant branding admin page.
- Platform name, logo, favicon, login background/video, colors, email sender, footer text.
- Feature-flag-aware controls for white-label options such as hiding “Powered by” and custom CSS.

### Landing page management
- Create/edit landing pages.
- Publish/unpublish pages.
- Manage block content and Shopify settings per landing page.

### Operations tools
- Test email page/endpoint.
- AI knowledge-base admin placeholder page exists (`/admin/ai`), but major functionality is still not shipped.

### SuperAdmin / platform control plane
- Separate platform dashboard at `/platform`.
- Tenant list with creation flow, search, risk indicators, billing indicators, and impersonation entrypoint.
- Tenant detail page with:
- plan/status editing
- trial/suspension management
- domain management
- feature-flag overrides
- recent audit log display

## 3) Integrations & automation (live)

### Shopify
- Webhook handling for:
- `orders/paid` -> user provisioning + enrollment + welcome/access email
- `orders/cancelled` / `orders/refunded` -> enrollment revocation

### Daily.co
- Video room token/room flows for coaching.
- Webhook ingestion for recording availability.
- Recording persistence and playback retrieval.

### Cron jobs
- Session reminder job (creates reminder notifications ~1h15 before session).
- Weekly summaries job (computes highlights, stores summaries, creates notification, sends email).
- Recipe sync cron endpoint exists.
- Billing dunning cron endpoint exists.
- Onboarding follow-up cron endpoint exists.

### File upload
- Generic upload API used for avatars and progress photos.

### Fitness integration foundation
- Fitness connections API exists.
- Strava integration helpers exist (OAuth/token refresh/activity sync logic in `lib`).

## 4) APIs available (implemented route groups)

- `api/auth/*` (login/session/register/verify/logout/me)
- `api/user/*` (profile, weekly summary, progress photos)
- `api/courses/*` + lesson progress + recordings
- `api/community/*` (posts/comments/likes)
- `api/messages/*` (conversations/messages)
- `api/sessions/*` + notes/calendar/room
- `api/trackers/*` (nutrition/check-ins/habits/cycle/symptoms)
- `api/recipes/*` (recipes, meal-plan, grocery-list)
- `api/notifications/*`
- `api/admin/*` (users, courses, sessions, community spaces, producten, recipes, forms, offers, onboarding, branding, billing, landing pages, test email)
- `api/platform/*` (tenants, domains, features, impersonation, follow-up)
- `api/forms/*` (member-facing form responses)
- `api/offers/*` (public offer lead capture)
- `api/webhooks/*` (shopify, daily)
- `api/cron/*` (reminders, summaries, recipe sync, billing dunning, onboarding follow-up)
- `api/upload`
- `api/fitness/connections`
- `api/stripe/webhook`

## 5) Present but not yet fully shipped

- SIX AI page is currently marked “Binnenkort beschikbaar” (`/six`).
- Admin AI page exists, but is still a placeholder shell without document management, logs, or settings workflows.
- Fitness API exposes provider status; full Strava callback/connect routes are not yet present in `src/app/api`.
- Stripe Connect marketplace behavior should still be treated as incomplete until end-to-end payment and payout flows are verified.
- Multi-tenant architecture exists in app/platform primitives, but hard tenant isolation is not yet something this inventory should imply as complete.
