# Dashboard Contexts

Last reviewed: March 19, 2026

Status note: current implementation note for the shared dashboard shell.

## Purpose

The dashboard shell now provides shared client-side context for:
- current user
- tenant branding

This removes repeated prop-drilling and avoids extra `/api/auth/me` requests on shared dashboard pages.
The shell also centralizes two cross-cutting UX guards:
- impersonation visibility
- required onboarding form gating

## Providers

- `src/components/layout/current-user-provider.tsx`
- `src/components/layout/branding-provider.tsx`

Both providers are mounted in:
- `src/app/(dashboard)/layout.tsx`

The same layout also mounts:
- `src/components/layout/impersonation-banner.tsx`
- `src/components/layout/form-completion-gate.tsx`

## Hooks

- `src/hooks/use-current-user.ts`
- `src/hooks/use-branding.ts`

Use these inside dashboard client components instead of passing `user` or `branding` down manually.

## Current Usage

Shared shell components:
- `src/components/layout/sidebar.tsx`
- `src/components/layout/mobile-nav.tsx`

Shared dashboard pages:
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/notifications/page.tsx`
- `src/app/(dashboard)/producten/page.tsx`

Layout-driven shell rules:
- SuperAdmins are redirected out of the dashboard shell to `/platform`.
- Active impersonation state is surfaced globally through the banner.
- Clients/coaches/support/staff with a pending required onboarding form are gated toward the assigned form route.

## Rule

If a client component only needs dashboard user or branding state, read it from context.
Only fetch again when the component needs an explicit refresh after a mutation.

If a behavior belongs to the dashboard shell rather than one page, prefer adding it to `src/app/(dashboard)/layout.tsx` instead of duplicating the logic across pages.
