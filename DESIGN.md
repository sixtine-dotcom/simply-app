---
name: Simply App — grocery-list surface
description: Shipped grocery workspace; documentation is scoped to /recipes/grocery-list.
colors:
  simply-green: "#2D5A27"
  accent: "#214f36"
  accent-hover: "#163d27"
  ink: "#202620"
  muted: "#636b64"
  white: "#fff"
  line: "#e2e6e0"
  field-border: "#cfd5cc"
  add-surface: "#f5f7f2"
  selected-surface: "#edf2eb"
  selected-ink: "#204d32"
  secondary-hover: "#f3f5f0"
  error-surface: "#fff1ee"
  error-ink: "#8b302b"
  field-error: "#9d302e"
typography:
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "40px"
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "14px"
  item:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.6
rounded:
  control: "6px"
  panel: "8px"
spacing:
  compact: "8px"
  control-gap: "10px"
  field-gap: "12px"
  panel-inset: "16px"
  section: "24px"
  workspace-gap: "42px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  add-panel:
    backgroundColor: "{colors.add-surface}"
    rounded: "{rounded.panel}"
    padding: "16px"
---

# Design System: Simply App — grocery-list surface

## Overview

This documents the shipped `/recipes/grocery-list` workspace only. It does not prescribe redesign of untouched customer routes, administration, or incumbent navigation. Future improvements proceed page by page with evaluation between pages.

The user explicitly selected impeccable.style as the reference: white space, strong list names, fine rules, and restrained accent. Montserrat and Simply green connect this surface to the existing brand. These are confirmed reference characteristics, not a newly invented global identity.

**Key Characteristics:**

- The active list name leads; products and adding stay close beneath it.
- An open white workspace uses rules rather than enclosing every section in cards.
- Dutch labels and inline editing keep the task direct.

## Colors

### Primary

Simply green is the existing Tailwind brand token. This page uses its own darker `accent` for primary actions, checked boxes, focus, and progress. Keep those source values distinct; they are not aliases.

### Neutral

`ink` establishes hierarchy, `muted` carries supporting text, and `line` separates rows and sections on white. The pale `add-surface` groups the add form and clipboard fallback. Selection uses `selected-surface` with `selected-ink`. Errors use the documented warm surface and dark red text.

## Typography

Montserrat is the shared sans family, loaded through `next/font` and `--font-montserrat`. The Seasons exists in the incumbent brand configuration but is not used for this workspace's headline.

The active list title is 40px/1.2, weight 450, with −0.035em tracking; at 600px and below it becomes 32px/1.22. Product names are 14px/1.6, weight 500; mobile names are 13px. Supporting quantities and metadata are 11–12px. Buttons are 12px/600; field labels are 11px/1.6/600. Inputs are 13px/1.5 and become 16px on small screens. Long names wrap rather than truncate; counts use tabular figures.

## Layout

The centered page has a 1320px maximum width, 34px 48px 110px padding, and 85vh minimum height. The desktop grid is `208px minmax(0, 1fr)` with a 42px gap and a fine sidebar divider. At viewport widths of at least 1500px, side padding is 64px and the grid is `230px minmax(0, 1fr)` with a 56px gap.

At 1150px and below, side padding becomes 28px, the sidebar is 170px, and the gap is 26px; the add action wraps to its own row. At 900px and below, a native list selector plus new-list action replaces the sidebar list above a single content column; the add form returns to one row. At 767px and below, the containing client main's top padding is removed only when this page is present.

At 600px and below, page padding is 18px 20px 150px; the add form uses `minmax(0, 1fr) 88px 44px`. The add action shows its icon while retaining an accessible text label. Quantities sit under product names, and edit fields use two columns with the product spanning both. Check rows have at least 64px height (67px desktop). No global shell changes are implied.

## Elevation & Depth

The grocery workspace has no box shadows. Fine 1px rules and pale green surfaces establish grouping. Loading uses static pale skeleton blocks; a spinner appears during add operations.

## Shapes

The frontmatter records module declarations: 6px control and checkbox corners, 8px list-choice/icon/panel corners, and 44px minimum heights for standard actions and fields. The incumbent `.client-compact` shell overrides some rendered values: its button rule sets `min-height: 2.25rem` and `border-radius: 0.2rem`, while its input/select/textarea rule forces `border-radius: 0.2rem !important`. These shell-computed exceptions must not be mistaken for uniform rendered 6px controls or 44px button minima. Fields retain the module’s 44px minimum height. Explicit 44px icon heights remain; mobile title-edit icons are 40px wide by 44px high. Checkbox visuals remain 24px square with 6px corners inside label targets at least 67px high on desktop and 64px on mobile. Panels retain their module corners.

## Components

- **Actions:** green primary, bordered white secondary, quiet text, and icon buttons. Primary hover darkens; secondary hover uses a pale surface. Disabled controls use .55 opacity and a wait cursor.
- **Fields:** white fill, 1px field border, visible labels, muted placeholders; the shell forces 0.2rem corners as described above. Focus uses a 2px accent outline with 4px offset, including the custom checkbox visual.
- **List navigation:** desktop names with remaining counts and selected pale green fill; native select on mobile. Existing application navigation remains incumbent.
- **Product rows:** real checkbox, wrapping product name, quantity, and inline edit action separated by bottom rules. Checked names strike through and use muted text. Toggling is optimistic and rolls back on failure.
- **Inline forms:** rename, add, edit quantity/unit, and create list. Successful adding clears the form and restores focus to the product field after controls re-enable. Removal requires inline confirmation.
- **States:** initial loading skeleton; first-list and empty-product guidance; all-checked status; saving/disabled feedback; inline field errors and load retry; clipboard success announcement and selectable textarea fallback. Recipe selection is optional, initially closed, searchable, and includes loading, retry, and no-results messages.

Button and checkbox transitions use 160ms ease-out; spinner rotation uses 1s linear. Reduced-motion disables animations and transitions within this page.

## Do's and Don'ts

- **Do** keep the active list name as the main visual anchor, with product entry directly available.
- **Do** preserve visible focus, real checkboxes, wrapping names, rollback, error recovery, and clipboard fallback.
- **Do** preserve shared Montserrat and existing Simply assets when improving another page within its separately agreed scope.
- **Don't** turn this grocery layout into a mandate for untouched routes.
- **Don't** add a large introductory card or permanently expanded recipe panel before the active list.

Source of truth: `src/components/recipes/grocery-workspace.tsx`, its CSS module, the grocery-list route, `tailwind.config.ts`, global font setup, and `.impeccable/grocery-direction-contract.md`. Shipped review captures: `.impeccable/review/grocery/desktop.png` and `mobile.png`.
