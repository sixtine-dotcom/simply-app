# Desktop Implementation Status

Last updated: March 19, 2026
Reference:
- `docs/DESKTOP-IMPLEMENTATION-PLAN.md`
- `docs/FEATURE-INVENTORY.md`

## Summary

The codebase has moved materially beyond the original "single-tenant MVP only" baseline.
There is now real implementation across:
- tenant data models and domain resolution
- platform control-plane routes
- impersonation and audit logging
- admin onboarding flows
- tenant billing UI and subscription state management
- tenant branding and feature-flag-driven white-label controls
- offers and internal access-assignment flows
- forms and required-form tracking

The roadmap is still not complete, but the current state is stronger than the previous draft implied.
The biggest remaining gaps are now:
- full tenant-isolation hardening across all data access paths
- true Stripe Connect payout flow and real external billing lifecycle
- schema-based multi-tenancy / DB isolation from the original SPEC
- GDPR/export implementation
- systematic regression test coverage for multi-tenant and billing-critical behavior

## Confirmed Since Previous Draft

Clearly present in the current repo:
- Platform control plane:
  - `src/app/(platform)/platform/page.tsx`
  - `src/app/(platform)/platform/tenants/page.tsx`
  - `src/app/(platform)/platform/tenants/[id]/page.tsx`
- Platform tenant APIs:
  - `src/app/api/platform/tenants/route.ts`
  - `src/app/api/platform/tenants/[id]/route.ts`
  - `src/app/api/platform/tenants/[id]/domains/route.ts`
  - `src/app/api/platform/tenants/[id]/features/route.ts`
  - `src/app/api/platform/tenants/[id]/impersonate/route.ts`
  - `src/app/api/platform/tenants/[id]/follow-up/route.ts`
- Tenant billing and dunning UI/API:
  - `src/app/(dashboard)/admin/billing/page.tsx`
  - `src/app/api/admin/billing/route.ts`
  - `src/app/api/admin/billing/checkout/route.ts`
  - `src/app/api/admin/billing/portal/route.ts`
  - `src/app/api/cron/billing-dunning/route.ts`
- Tenant branding UI/API:
  - `src/app/(dashboard)/admin/branding/page.tsx`
  - `src/app/api/admin/branding/route.ts`
- Admin onboarding UI/API:
  - `src/app/(dashboard)/admin/onboarding/page.tsx`
  - `src/app/api/admin/onboarding/route.ts`
  - `src/app/api/admin/onboarding/actions/route.ts`
- Offers and access assignment:
  - `src/app/(dashboard)/admin/offers/page.tsx`
  - `src/app/api/admin/offers/*`
  - `src/lib/offer-access.ts`
- Forms:
  - `src/app/(dashboard)/admin/forms/*`
  - `src/app/(dashboard)/forms/*`
  - `src/app/api/admin/forms/*`
  - `src/app/api/forms/[slug]/responses/route.ts`

## Phase A — Foundation Refactor

Status: In progress

Clearly present:
- Tenant-related Prisma models exist:
  - `Tenant`
  - `TenantSettings`
  - `TenantSubscription`
  - `TenantFeatureFlag`
  - `FeatureFlag`
  - `TenantDomain`
- Tenant-aware helpers exist:
  - `src/lib/tenant.ts`
  - `src/lib/branding.ts`
  - `src/lib/feature-flags.ts`
- Tenant resolution from headers/domain exists in `src/lib/tenant.ts`.
- Expanded role model exists in code:
  - `SUPERADMIN`
  - `ADMIN`
  - `STAFF`
  - `COACH`
  - `CLIENT`
  - `SUPPORT`
- Dashboard shell now has centralized user/branding context for shared client pages.
- Tenant-aware branding persistence exists through `TenantSettings`.

Still missing or incomplete:
- No schema-based per-tenant database isolation / `search_path` model.
- No broad DB access abstraction; many modules still use `db.*` directly.
- Tenant context is not yet consistently enforced across the entire app.
- Domain/header resolution exists, but many query layers still rely on ad hoc `tenantId` filters rather than a single enforced access boundary.
- Exit criterion "no cross-tenant data access in tenant routes" is not yet proven.

## Phase B — SuperAdmin Desktop

Status: Mostly done for v1 control-plane UI, still incomplete for governance hardening

Clearly present:
- Separate platform route group exists:
  - `src/app/(platform)/platform/*`
- Platform tenant APIs exist:
  - tenant CRUD
  - tenant status updates
  - domains
  - feature flags
  - impersonation
  - follow-up actions
- Impersonation support exists in auth and platform APIs.
- Platform dashboard and tenant detail views are implemented.
- Tenant detail includes:
  - plan/status editing
  - trial/suspension fields
  - domain management
  - feature-flag overrides
  - recent audit log display
  - risk signals for pending activations and required forms

Still missing or incomplete:
- Audit visibility exists, but "fully logged" and operationally complete still needs verification across every sensitive action.
- Tenant lifecycle automation is still lighter than the SPEC's original provisioning model.
- Read-only-first impersonation boundaries and audit guarantees still deserve explicit validation.

## Phase C — Coach Signup + Tenant Provisioning

Status: Partially done

Clearly present:
- Tenant admin registration flow exists in auth logic.
- Tenant creation during registration is present in `src/lib/auth.ts`.
- Admin onboarding/dashboard support exists:
  - `src/lib/admin-onboarding.ts`
  - `/admin/onboarding`
- Onboarding includes practical setup actions and readiness tracking, not just a placeholder screen.
- Follow-up/platform actions for tenants exist.

Still missing or incomplete:
- No evidence of a complete paid coach signup funnel.
- No schema provisioning step for isolated tenant schemas.
- Provisioning is app-level record creation, not the full tenant bootstrap pipeline described in the original plan.
- Seeding/default templates may be partial, but not a full tenant provisioning pipeline as planned.

## Phase D — Stripe Connect + Platform Billing

Status: In progress

Clearly present:
- Billing and Stripe foundation exists in schema and app routes.
- Admin billing pages and API routes exist.
- Subscription/platform fee fields exist in Prisma.
- Plan definitions, platform-fee percentages, subscription lifecycle helpers, and dunning tracking exist in `src/lib/billing.ts`.
- Platform dashboard includes aggregate billing visibility.
- Stripe webhook plumbing exists:
  - `src/app/api/stripe/webhook/route.ts`

Still missing or incomplete:
- Original plan explicitly required Stripe Connect onboarding and platform fee capture flow.
- No confirmation yet of end-to-end student payment -> coach payout -> platform fee capture.
- Current implementation appears to cover internal subscription state and billing operations more than full marketplace money movement.
- Webhook and lifecycle coverage should be treated as incomplete until tested against the roadmap exit criteria.

## Phase E — White-label v1 Desktop

Status: Mostly done for v1 desktop

Clearly present:
- Tenant branding settings exist in schema and admin UI.
- Dynamic branding/theme injection exists.
- Platform name, logo, favicon, colors, login assets, and "Powered by" logic exist.
- Dashboard shell has been refactored to use centralized branding context.
- Feature-flag-gated white-label controls exist for:
  - `hide_powered_by`
  - `custom_css`
- Login background/video and email sender settings are exposed in admin UI/API.

Still missing or incomplete:
- Email branding should be verified end-to-end, not just by available fields.
- White-label behavior is still constrained by the broader tenant architecture limitations.

## Phase F — Course Platform Hardening

Status: Partially done

Clearly present:
- Course/module/lesson stack already exists.
- Drip/access/progress behavior exists.
- Lesson attachments and multiple lesson content modes exist.

Still missing or incomplete:
- No evidence of strict regression tests for drip/progress exit criteria.
- Naming/API normalization against the SPEC is still likely unfinished.
- Provider abstraction / Mux path validation is not clearly complete.

## Phase G — Community + Messaging MVP Fit

Status: Partially done, with adjacent product-surface growth

Clearly present:
- Community and messaging features are live.
- Offer/course/community relationship logic exists.
- Some permission-aware checks exist.
- Course-linked community membership helpers exist.
- Offers now create concrete access/enrollment flows rather than being only a roadmap concept.
- Forms now exist as an adjacent member-ops product surface:
  - admin builder
  - assignment model
  - member-facing runner
  - pending/required completion tracking

Still missing or incomplete:
- Tenant-safe shared guard layer is not clearly centralized yet.
- Permission matrix for Staff/Coach/Admin is not clearly formalized and tested.
- "No permission leaks" is not yet something the current codebase proves by structure or tests.

## Phase H — Analytics v1 + GDPR MVP

Status: Mostly open

Clearly present:
- Some admin/business metrics exist.
- There are export helpers for community insights, but not the GDPR pipeline from the roadmap.

Still missing or incomplete:
- GDPR consent logging model/API/UI is not clearly present.
- Full user data export job is not clearly present.
- Admin/SuperAdmin GDPR event visibility is not clearly present.

## Cross-Cutting Backlog

Status: Largely still open

Still needed:
- test baseline for tenant resolution, plan gating, fee calculations, permission matrix
- worker stack / async jobs infrastructure as planned
- migration safety for tenant operations
- stronger observability and structured logging
- explicit architecture rules for tenant-safe query boundaries

## Practical Read

If you judge progress against the original roadmap:
- Phase B/E have advanced further than the previous draft suggested
- Phase C/D have meaningful operational implementation, but not full SPEC completion
- Phase G has grown via offers/forms/member-ops capabilities, even if the original tenant/permission hardening is still incomplete
- Phase A is still not complete because tenant isolation architecture is not finished
- Phase H is still mostly open

## Recommendation

The next high-leverage step is still the same in spirit as the original plan:
finish the tenant foundation properly before expanding more product surface.

Most important remaining technical gaps:
1. enforce tenant isolation more systematically
2. formalize Stripe Connect and real external billing flows end-to-end
3. add tests for tenant, permission, onboarding, and billing-critical paths
4. implement GDPR/export requirements explicitly instead of implicitly
5. decide whether the current pragmatic tenant model is the target architecture, or whether the original schema-isolation SPEC is still mandatory
