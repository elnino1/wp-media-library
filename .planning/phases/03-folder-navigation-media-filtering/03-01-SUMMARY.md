---
phase: 03-folder-navigation-media-filtering
plan: 01
subsystem: api
tags: [php, wordpress, rest-api, taxonomy, react, javascript]

# Dependency graph
requires:
  - phase: 02-folder-management-ui
    provides: Folder taxonomy registered as wp_virtual_folder with REST enabled
provides:
  - REST filter hook that applies taxonomy-based WP_Query filtering to /wp/v2/media requests
  - getItems() sends wpmf_folder query param (inbox string or numeric folder ID)
  - Grid contextual empty states for inbox vs folder views
affects:
  - 03-02 and later plans that depend on filtered media views

# Tech tracking
tech-stack:
  added: []
  patterns:
    - WordPress rest_attachment_query filter for injecting tax_query into REST media endpoints
    - null-sentinel pattern for inbox (null folderId maps to inbox, positive int maps to folder)

key-files:
  created: []
  modified:
    - includes/class-wpmf-taxonomy.php
    - src/api/client.js
    - src/components/Grid.js

key-decisions:
  - "Use rest_attachment_query WordPress filter rather than a custom REST route to keep the architecture minimal and leverage core WP_Query tax_query support"
  - "Use the string literal 'inbox' as the wpmf_folder param value for unassigned media, distinguished from numeric folder IDs, so both branches are unambiguous in the backend filter"
  - "Treat null folderId as inbox (NOT EXISTS) and positive integer as folder ID; 0 is never sent to the API"

patterns-established:
  - "PHP filter pattern: register via rest_api_init hook, apply via rest_attachment_query filter, check param with get_param(), branch on value type"
  - "JS client pattern: map null folderId to 'inbox' string using ternary before building query args"

requirements-completed:
  - MEDIA-01

# Metrics
duration: 1min
completed: 2026-03-19
---

# Phase 3 Plan 01: Folder Media Filtering Summary

**End-to-end folder filtering via WordPress rest_attachment_query filter and wpmf_folder query param, with inbox (NOT EXISTS tax_query) and folder (term_id tax_query) branches**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-19T20:52:02Z
- **Completed:** 2026-03-19T20:53:03Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Backend PHP filter intercepts all /wp/v2/media REST requests and applies wp_virtual_folder taxonomy filtering when wpmf_folder param is present
- Inbox mode uses WP_Query NOT EXISTS operator to surface only media with no folder assignment
- Frontend getItems() now sends wpmf_folder param, and Grid passes selectedFolderId as null (not 0) so the inbox branch is correctly triggered
- Grid shows contextual empty state messages distinguishing inbox from folder views

## Task Commits

Each task was committed atomically:

1. **Task 1: Add REST media query filter for folder-based filtering in PHP** - `9874931` (feat)
2. **Task 2: Wire folderId into getItems API call and update Grid empty states** - `2e07ea4` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `includes/class-wpmf-taxonomy.php` - Added register_rest_fields() and filter_media_by_folder() methods; hooked into rest_api_init
- `src/api/client.js` - Updated getItems() signature (folderId=null), added wpmf_folder query arg with inbox/folder branching
- `src/components/Grid.js` - Changed getItems call to pass selectedFolderId directly (not || 0); updated empty state to contextual messages

## Decisions Made

- Used `rest_attachment_query` WordPress filter instead of a custom endpoint — keeps architecture simple and leverages WP_Query tax_query natively
- Chose string literal `'inbox'` as the wpmf_folder value for unassigned media to make the two branches unambiguous without relying on a reserved numeric value
- Default folderId changed from `0` to `null` to serve as a clean sentinel for the inbox state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Folder filtering is now fully wired end-to-end; selecting a folder in the sidebar will show only media assigned to that folder
- Inbox selection shows only media with no folder term assigned
- Pagination (per_page + page params) continues to work within filtered views
- Ready for the next plan in phase 03

---
*Phase: 03-folder-navigation-media-filtering*
*Completed: 2026-03-19*
