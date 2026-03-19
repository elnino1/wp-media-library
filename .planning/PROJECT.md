# WP Media Library Folders

## What This Is

A WordPress plugin that introduces virtual folder management for media attachments in wp-admin. Folders are backed by a custom taxonomy (`wp_virtual_folder`) — no files are physically moved. When a media item is dragged into a folder, the folder's mapped WP tags are automatically applied to the item (replacing any existing tags).

Built for public release. Target: WordPress 6.x+, PHP 8.x+.

## Core Value

Media items are automatically tagged the moment they're organized — zero extra steps for the user.

## Requirements

### Validated

- ✓ Custom taxonomy `wp_virtual_folder` registered and bound to `attachment` — existing
- ✓ REST API endpoints: `GET /wpmf/v1/folders`, `POST /wpmf/v1/folders`, `POST /wpmf/v1/move` — existing
- ✓ React SPA scaffolded in wp-admin (`src/index.js`, `Sidebar`, `Grid`, `Inspector`) — existing
- ✓ Drag-and-drop infrastructure (`dnd-kit`) wired — existing
- ✓ Inspector component with folder tag-mapping save flow — existing (phase 2 complete)
- ✓ Tag auto-creation on save (new term names created via REST before saving) — existing (phase 2 complete)

### Active

- [ ] Drag media item into folder actually moves it (currently drops silently)
- [ ] Create sub-folder under selected folder works
- [ ] Upload button in Grid opens WP media uploader correctly
- [ ] Moving an item into a folder replaces its WP tags with the folder's mapped tags (auto-tag on move)
- [ ] Inspector loads existing folder tag mappings when a folder is selected
- [ ] Inbox (root) shows items with no folder assigned

### Out of Scope

- WooCommerce product support — deferred to v2; media-only for v1
- Bulk multi-select move — deferred to v2
- WP-CLI integration — nice-to-have, not v1
- Physical file reorganization — explicitly excluded; non-destructive virtual folders only
- PHP 7.x / WP 5.x compatibility — modern stack only (WP 6.x+, PHP 8.x+)

## Context

- Architecture doc in `_bmad-output/architecture/plugin-architecture.md`
- Codebase map in `.planning/codebase/`
- Tag mapper PHP hook (`set_object_terms`) is commented out — needs implementation
- `class-wpmf-tag-mapper.php` has the meta registration but the actual hook logic is a stub
- The `handleSave` flow in `Inspector.js` saves term IDs to `wpmf_mapped_post_tags` (tags) and `wpmf_mapped_product_cats` (categories) via WP term meta
- Move endpoint (`POST /wpmf/v1/move`) exists in `class-wpmf-api.php` but tag application is not wired

## Constraints

- **Tech Stack**: React (`@wordpress/element`), `@wordpress/api-fetch`, `dnd-kit`, Webpack (WP scripts)
- **Backend**: PHP 8.x+, WordPress 6.x+ REST API, custom taxonomy
- **Distribution**: Public plugin — must follow WordPress coding standards for activation/deactivation
- **Non-destructive**: Never move physical files, never break media URLs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Virtual folders via taxonomy (not directories) | Avoids breaking URLs used by 3rd-party integrations (Printful, etc.) | ✓ Good |
| Tags replace on move (not additive) | Simpler mental model — folder defines the tag set | — Pending |
| Inspector auto-creates unknown tag names | Users type names freely; backend creates missing terms | ✓ Good |
| Media-only for v1 | WooCommerce adds complexity; validate core UX first | — Pending |

---
*Last updated: 2026-03-19 after initialization*
