# Documentation Guide

Last reviewed: March 19, 2026

This folder contains a mix of current state reference docs and older planning/design documents.
Use this file as the entry point.

Related root-level guides:
- `../README.md` — project overview
- `../SETUP.md` — local setup
- `../DEPLOYMENT.md` — deployment guide

## Read First

If you want to understand the current codebase quickly, start here:
- `FEATURE-INVENTORY.md` — current shipped product surface
- `DESKTOP-IMPLEMENTATION-STATUS.md` — audited implementation status against the desktop/platform roadmap
- `DASHBOARD-CONTEXTS.md` — current dashboard shell context and shared-layout rules
- `INTEGRATIONS.md` — integration status plus design notes

## Current State Reference

- `FEATURE-INVENTORY.md`
  What is live in the app right now across member, admin, platform, API, and automation surfaces.

- `DESKTOP-IMPLEMENTATION-STATUS.md`
  Best high-level audit of what has been implemented versus the desktop/platform roadmap.

- `DASHBOARD-CONTEXTS.md`
  Shared dashboard-shell architecture for user context, branding, impersonation visibility, and onboarding-form gating.

- `INTEGRATIONS.md`
  Current integration overview for Shopify, Daily, Stripe tenant billing, and platform operations.

## Mixed Current and Historical

- `DATA-MODEL.md`
  Contains useful conceptual schema background, but must be read with `prisma/schema.prisma` as source of truth.

- `SECURITY.md`
  Contains useful security intent plus a current state snapshot, but not every policy section is a verified statement of live enforcement.

- `UX-ARCHITECTURE.md`
  Useful for navigation and product-shape reference, with historical wireframes retained below the current UX snapshot.

## Historical / Planning

- `DESKTOP-IMPLEMENTATION-PLAN.md`
  Target roadmap aligned to the original external SPEC.

- `PRD.md`
  Earlier product framing before the newer tenant/platform expansion.

- `MILESTONES.md`
  Original milestone plan rather than the current source of truth for delivery status.

## Practical Rule

When docs conflict:
1. trust the code and `prisma/schema.prisma`
2. then trust the current state docs listed in "Read First"
3. treat the historical docs as architecture intent, not build-status truth
