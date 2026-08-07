# Desktop Implementation Plan (SPEC.md Alignment)

Status note: historical roadmap aligned to the original external SPEC.

This document is still useful as the target architecture and phase framing.
It is not the best description of what is already implemented today.
Use these companion docs alongside it:
- `docs/DESKTOP-IMPLEMENTATION-STATUS.md`
- `docs/FEATURE-INVENTORY.md`

Last updated: March 5, 2026  
Reference: `/Users/sixtineophoff/Downloads/SPEC.md` (Sections 33 + 34 first)

## 1. Current State vs SPEC (Reality Check)

What already exists:
- Single-tenant learning platform with courses, community, messaging, coaching, trackers, recipes.
- Admin area for users/courses/community/sessions/recipes/products/landing pages.
- Clerk login is active; legacy custom auth still exists in code.
- At the time this plan was written, Stripe Connect, tenant system, SuperAdmin layer, and schema-based multi-tenancy were not implemented.

Biggest gaps to reach SPEC MVP:
- No platform/tenant split (`platform` schema + `tenant_*` schemas).
- No tenant-aware middleware + subdomain routing.
- No SuperAdmin domain or tenant lifecycle.
- No coach signup -> paid onboarding -> tenant provisioning flow.
- No Stripe Connect onboarding and no platform-fee engine.
- White-label is not tenant-based yet.
- No GDPR consent + full data export pipeline.

## 2. Non-Negotiable Decisions (Before Build)

Lock these first to prevent rework:
- Auth strategy: keep Clerk or move to in-house JWT/refresh flow (SPEC asks JWT-first).
- Multi-tenant strategy: schema-based PostgreSQL with `search_path` per request.
- Deployment model: `app` + worker process (BullMQ), Redis required.
- Tenant routing: subdomain first; path fallback only for local/dev.
- Desktop-first only; mobile is explicitly out of scope now.

## 3. Desktop Roadmap (Phased)

## Phase A — Foundation Refactor (2–3 weeks)
Goal: make the existing app tenant-ready without feature expansion.

Deliverables:
- Introduce `platform` schema models: `Tenant`, `TenantSubscription`, `FeatureFlag`, `TenantSettings`, `PlatformAuditLog`.
- Add tenant context middleware:
- resolve tenant from host/subdomain
- validate active tenant
- inject tenant context into request
- Add DB access layer abstraction to avoid direct `db.*` calls everywhere.
- Add role expansion baseline: `SUPERADMIN`, `ADMIN`, `STAFF`, `COACH`, `STUDENT`.

Exit criteria:
- App runs with tenant context.
- No cross-tenant data access in tenant routes.
- Existing core pages still functional.

## Phase B — SuperAdmin Desktop (2 weeks)
Goal: deliver the control plane from SPEC section 10.

Deliverables:
- New SuperAdmin app area (separate route group): overview, tenant list, tenant detail.
- Actions: create tenant, suspend/reactivate tenant, set plan, feature flags.
- Impersonation (read-only first), fully logged.
- Platform audit log viewer.

Exit criteria:
- SuperAdmin can manage tenants end-to-end from UI.
- All sensitive actions are audited.

## Phase C — Coach Signup + Tenant Provisioning (1.5–2 weeks)
Goal: automated onboarding path from SPEC section 4.

Deliverables:
- Public coach signup flow.
- Tenant provisioning service:
- create tenant record
- create tenant schema
- seed default tenant data (roles/settings/templates)
- assign initial admin user
- Onboarding checklist in coach dashboard.

Exit criteria:
- New coach can self-serve signup and land in their own tenant.

## Phase D — Stripe Connect + Platform Billing (2–3 weeks)
Goal: implement SPEC section 7 and plan economics.

Deliverables:
- Stripe Connect account onboarding (Express).
- Platform subscription billing for coaches (Starter/Pro/Enterprise).
- Checkout flow for student purchases routed to connected account.
- Platform fee calculation engine by plan (5%/2%/0%).
- Stripe webhooks for payment/subscription lifecycle.

Exit criteria:
- Real test transaction: student payment -> coach account credited -> platform fee captured.

## Phase E — White-label v1 Desktop (1.5 weeks)
Goal: tenant branding baseline (SPEC section 5).

Deliverables:
- Tenant brand settings: platform name, logo, primary color, favicon (optional in v1).
- Dynamic theme injection from tenant settings.
- Email sender display name + basic template branding.
- Starter plan “Powered by” logic.

Exit criteria:
- Different tenants clearly render different branding on desktop.

## Phase F — Course Platform Hardening to SPEC MVP (2–3 weeks)
Goal: align existing course stack with MVP definitions.

Deliverables:
- Normalize Program/Module/Lesson naming and API contracts.
- Ensure lesson types: video, text, PDF are explicit.
- Drip scheduling based on enrollment date (strict tests).
- Progress logic cleanup (manual complete + video thresholds).
- Mux ingestion path validation (or keep current provider but abstract provider contracts).

Exit criteria:
- Admin -> publish course -> enroll student -> locked/drip/progress flows all pass.

## Phase G — Community + Messaging MVP Fit (1.5 weeks)
Goal: keep existing implementation but align permissions and tenant isolation.

Deliverables:
- Tenant-safe post/message queries via shared guard layer.
- Staff/Coach/Admin permission matrix.
- Real-time readiness adapter boundary (Socket later, API now).

Exit criteria:
- No permission leaks; core community and DM paths stable.

## Phase H — Analytics v1 + GDPR MVP (2 weeks)
Goal: complete remaining MVP scope items.

Deliverables:
- Coach analytics cards: members, revenue, active programs.
- GDPR consent logging model + API + UI integration.
- Data export job (async) for current user.
- Admin/SuperAdmin visibility for GDPR events.

Exit criteria:
- User can request export; generated package available securely.

## 4. Suggested Sprint Sequence (10–14 weeks total)

1. Sprint 1–2: Phase A  
2. Sprint 3: Phase B  
3. Sprint 4: Phase C  
4. Sprint 5–6: Phase D  
5. Sprint 7: Phase E  
6. Sprint 8–9: Phase F  
7. Sprint 10: Phase G  
8. Sprint 11: Phase H  

## 5. Technical Backlog (Cross-cutting, run in parallel)

- Add test baseline (unit + integration) for:
- tenant resolution
- plan gating
- fee calculations
- permission matrix
- Introduce background worker stack (BullMQ + Redis).
- Add structured logs + audit helpers.
- Add migration safety scripts for tenant schema operations.
- Add error boundary + observability hooks (Sentry later if desired).

## 6. Immediate Next Build Step (Recommended)

Start with **Phase A, Task 1**:
- Add platform-level Prisma models (`Tenant`, `TenantSubscription`, `TenantSettings`, `FeatureFlag`, `PlatformAuditLog`) and migration.

Reason:
- Every other desktop feature in your SPEC depends on tenant primitives.
- Prevents building more single-tenant screens that must be rewritten.
