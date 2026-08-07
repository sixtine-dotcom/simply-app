# Simply Platform — Complete Analysis & Launch Readiness

Last updated: March 28, 2026
Status: **In active development — estimated 75% launch-ready**

---

## Executive Summary

Simply Platform is a well-architected multi-tenant SaaS learning platform combining Kajabi (courses), Circle (community), and coaching tools in a single branded experience. The foundation is solid and production-grade. Several key differentiators already exist that Kajabi does not offer (holistic health trackers, cycle tracking, video coaching, Dutch-first UX). After this audit, the remaining gaps are clearly defined and addressable.

**What was implemented in this session:**
- ✅ SIX AI — full chat interface with Claude API + streaming + feedback loop
- ✅ Admin AI Knowledge Base — full CRUD for knowledge sources that feed SIX AI
- ✅ Course Completion Certificates — SVG certificate generated at 100% progress
- ✅ Analytics Dashboard — charts for member growth, course completion, engagement KPIs
- ✅ 404 Not-Found page
- ✅ Dashboard loading state
- ✅ Prisma schema additions (tenantId on AiSource, AiConversation title)
- ✅ Textarea UI component

---

## 1. What's Already Excellent (Keep As-Is)

### Architecture
- Next.js 14 App Router with proper route groups `(auth)`, `(dashboard)`, `(platform)`
- Prisma + PostgreSQL — robust schema covering all business domains
- Clerk auth — production-grade authentication, handles magic links, sessions
- Multi-tenant primitives: Tenant, TenantSettings, TenantSubscription, TenantFeatureFlag, TenantDomain
- SuperAdmin control plane at `/platform` — tenant management, impersonation, audit log

### Client features
- Complete course system: modules, lessons, drip unlock, progress tracking, recordings playback
- Community: spaces, posts, comments, likes, voice memos, host-only channels
- Direct messaging: 1:1 conversations with unread counts
- Coaching: session booking, Daily.co video rooms, ICS calendar export
- Holistic trackers: nutrition, check-ins, habits, cycle, symptoms, progress photos, weekly overview
- Recipes: library, grocery list, meal planner, nutrition plan download
- Forms system: builder, assignments, required forms, member runner
- Offers: one-time, subscription, payment-plan offers with course access assignment
- Landing pages: block-based public landing page builder
- Notification system: reminders, weekly summaries

### Admin backoffice
- Strong user management: add, import CSV, bulk invite, user detail page
- Course management: full CRUD, duplicate, JSON import, Shopify mapping
- Admin onboarding guided flow with readiness tracking
- Branding: platform name, logo, favicon, colors, login background, custom CSS
- Tenant billing with subscription lifecycle and dunning automation
- Shopify webhook integration: order.paid → provision user + enrollment

---

## 2. What Needs To Be Done For Launch

### 🔴 Critical (must have before going live)

#### 2.1 Environment Variables — Set these before deploying
```
ANTHROPIC_API_KEY=sk-ant-...      # For SIX AI
RESEND_API_KEY=re_...             # Transactional email
EMAIL_FROM=Simply <noreply@...>   # Email sender
APP_URL=https://yourdomain.com    # Must match actual domain
DATABASE_URL=postgresql://...     # Neon/Supabase DB
CLERK_SECRET_KEY=...              # Clerk backend key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... # Clerk frontend key
DAILY_API_KEY=...                 # Daily.co video rooms
STRIPE_SECRET_KEY=...             # Stripe billing
STRIPE_WEBHOOK_SECRET=...         # Stripe webhook verification
```

#### 2.2 Stripe Billing — Wire up real payments
**Current state:** Subscription state management exists in code and DB, but there is no real Stripe checkout flow that creates actual subscriptions. The billing page shows plan info but `admin/billing/checkout` route likely doesn't create real Stripe sessions.

**Fix needed:**
- Verify `src/app/api/admin/billing/checkout/route.ts` creates real Stripe checkout sessions
- Verify `src/app/api/stripe/webhook/route.ts` handles `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
- Test the full cycle: checkout → webhook → subscription created in DB → dunning if late

#### 2.3 Email Verification Flow
**Current state:** Custom registration flow exists alongside Clerk. Verify the magic link and registration flows work end-to-end with real email delivery.

**Test checklist:**
- [ ] User registers → receives welcome email
- [ ] Magic link email delivered within 30 seconds
- [ ] Link expires after 15 minutes
- [ ] Link single-use enforced
- [ ] Shopify order → user provisioned → welcome email received

#### 2.4 Populate SIX AI Knowledge Base
The SIX AI chat is now functional but empty. Before launch, populate the knowledge base via `/admin/ai` with:
- Program guidelines and protocols
- Common FAQ answers
- Nutrition/macro guidance
- Hormone/cycle education
- Recipe information

---

### 🟡 High Priority (first 30 days post-launch)

#### 2.5 Email Marketing / Automation Sequences
**Missing:** No drip email sequences or broadcast email system.
**Kajabi has:** Full email marketing with sequences, broadcasts, tagging, segmentation.
**Recommendation:** Integrate Resend Broadcasts or add a simple sequence builder:
- Welcome sequence (Day 0, 3, 7 after enrollment)
- Course drip notifications (when new module unlocks)
- Weekly engagement emails
- Win-back emails for inactive members

**Schema needed:** `EmailSequence`, `EmailSequenceStep`, `EmailSequenceEnrollment`

#### 2.6 Affiliate / Referral System
**Missing:** No affiliate tracking or referral links.
**Impact:** Viral growth mechanism, can reduce CAC significantly.
**Recommendation:**
- Add `referralCode` and `referredBy` to User
- Track referral conversions via offer leads
- Admin dashboard for affiliate payouts

#### 2.7 Quiz / Assessment Builder
**Missing:** No quiz capability in lessons.
**Kajabi has:** Quiz builder with pass/fail, scores, conditional unlock.
**Recommendation:** Add `LessonQuiz` and `LessonQuizQuestion` models, quiz renderer in lesson page.

#### 2.8 Stripe Connect (for multi-tenant coaches)
**Current state:** Platform billing exists but coaches cannot accept payments from their own students.
**Needed for full multi-tenant SaaS:** Each coach tenant needs their own Stripe Connect account to receive payments, with the platform taking a percentage fee.

#### 2.9 Tenant Isolation Hardening
Many DB queries lack consistent tenantId filters. Before scaling to multiple coach tenants, audit all API routes to ensure:
- `user.tenantId` is always applied to queries
- No cross-tenant data leakage is possible
- All admin routes verify the user's tenant matches the resource

---

### 🟢 Nice-to-Have (3+ months post-launch)

#### 2.10 GDPR Compliance
- User data export endpoint (download all personal data as JSON/ZIP)
- Consent logging for GDPR
- Right to erasure implementation
- Cookie consent banner

#### 2.11 Search
- Global search across courses, community posts, recipes, members
- Recommend: Algolia, MeiliSearch, or Postgres full-text search

#### 2.12 Gamification
- Course completion badges
- Habit streaks
- Points/leaderboard for community engagement

#### 2.13 Mobile App (PWA first)
- Add `manifest.json` and service worker for PWA support
- Push notifications via Web Push API
- Native mobile app (React Native) as longer-term investment

#### 2.14 Advanced Analytics
- Cohort analysis (which month's enrollees complete the most?)
- Revenue tracking per course/offer
- Churn prediction
- Export to CSV for admins

#### 2.15 Calendar Integration
- Google Calendar / Outlook OAuth for coaching sessions
- Two-way sync for session scheduling

---

## 3. Competitive Comparison vs Kajabi

| Feature | Kajabi | Simply | Advantage |
|---------|--------|--------|-----------|
| Courses + drip | ✅ | ✅ | — |
| Community | ✅ | ✅ | — |
| Email marketing | ✅ Full automation | ⚠️ Transactional only | Kajabi |
| Affiliate program | ✅ | ❌ | Kajabi |
| AI assistant | ✅ Basic | ✅ Full Claude AI | **Simply** |
| Health trackers | ❌ | ✅ Nutrition/cycle/habits | **Simply** |
| Video coaching | ❌ | ✅ Daily.co built-in | **Simply** |
| Holistic health | ❌ | ✅ | **Simply** |
| Multi-tenant | ❌ | ✅ | **Simply** |
| Certificates | ✅ | ✅ | — |
| Landing pages | ✅ | ✅ | — |
| Mobile app | ✅ | ❌ (PWA possible) | Kajabi |
| Quizzes | ✅ | ❌ | Kajabi |
| Price | $149-$399/mo | TBD | Potentially **Simply** |
| Dutch-first | ❌ | ✅ | **Simply** |

**Simply's strongest differentiators:**
1. SIX AI — personalized health coaching AI (Kajabi has no equivalent)
2. Complete holistic health tracking (nutrition + cycle + habits + symptoms)
3. Built-in video coaching with Daily.co
4. Dutch-first UX for the NL/BE health coaching market
5. Lower price point potential with multi-tenant model

---

## 4. Technical Debt & Risks

### 4.1 Test Coverage
**Risk level: HIGH**
Zero automated tests. Before scaling, add:
- Integration tests for Stripe billing lifecycle
- Unit tests for tenant isolation
- E2E tests for critical user flows (login, enroll, complete lesson)

### 4.2 Error Handling
Some API routes use broad `try/catch` returning generic 500 errors. Add more specific error handling and logging (consider Sentry).

### 4.3 File Storage
Upload API saves files without a CDN. For production, ensure files go to S3/Cloudflare R2/Vercel Blob with proper size limits and content-type validation.

### 4.4 Rate Limiting
No rate limiting on auth endpoints (magic link requests). Add rate limiting before public launch to prevent abuse.

---

## 5. Launch Readiness Checklist

### Pre-launch (this week)
- [ ] Set all environment variables in Vercel
- [ ] Test magic link email flow end-to-end
- [ ] Test Shopify webhook with a real test order
- [ ] Verify Stripe checkout and webhook work
- [ ] Populate SIX AI knowledge base (at least 10 sources)
- [ ] Verify Daily.co video room works for a test coaching session
- [ ] Check all admin pages load without errors
- [ ] Test course enrollment and lesson completion flow
- [ ] Test community posting and DMs
- [ ] Configure Clerk production keys

### Week 1 post-launch
- [ ] Monitor Sentry/logs for errors
- [ ] Verify email deliverability (check spam scores)
- [ ] Test mobile responsiveness on real devices
- [ ] Add first AI knowledge sources
- [ ] Onboard first beta users

### Month 1
- [ ] Build email automation sequences
- [ ] Add affiliate tracking
- [ ] Add quiz builder to lessons
- [ ] Implement GDPR export

---

## 6. Immediate Next Steps (Prioritized)

1. **Set environment variables** — critical, nothing works without these
2. **Test Stripe billing** — verify checkout creates real subscription
3. **Populate AI knowledge base** — SIX AI is live but empty
4. **Email deliverability audit** — test all transactional emails
5. **Mobile UX audit** — check all pages on iPhone/Android
6. **Add email automation** — biggest missing feature vs Kajabi
7. **Affiliate system** — viral growth mechanism
8. **Quiz builder** — learning completeness
