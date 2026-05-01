---
phase: 04-move-auto-tag-completion
plan: 01
subsystem: api
tags: [php, wordpress, taxonomy, term-meta, rest-api, wp-media]

# Dependency graph
requires:
  - phase: 03-folder-navigation-filtering
    provides: move_items REST endpoint and folder taxonomy wired end-to-end
provides:
  - WPMF_Tag_Mapper::apply_tags_for_folder static method (get_term_meta + wp_set_object_terms)
  - Tag mapper called from move_items after successful folder assignment
  - media-views script handle enqueued so window.wp.media is available on admin page
affects: [any future phase using tag-on-move behavior, upload UI interactions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Direct static method call from REST endpoint (not hook-based) to avoid recursion risk
    - Guard $folder_id > 0 before calling tag mapper (inbox moves do not apply tags)
    - array_merge to extend auto-generated asset dependencies with WP core handles not detectable from JS imports

key-files:
  created: []
  modified:
    - includes/class-wpmf-tag-mapper.php
    - includes/class-wpmf-api.php
    - includes/class-wpmf-admin-page.php

key-decisions:
  - "Direct call over hook: WPMF_Tag_Mapper::apply_tags_for_folder called directly from move_items instead of using set_object_terms hook, preventing recursion since move_items itself calls wp_set_object_terms"
  - "append=false in wp_set_object_terms: replaces item tags with folder's mapped tags (MOVE-02 requires replacement semantics)"
  - "folder_id > 0 guard: moving to inbox (folder_id=0) intentionally skips tag mapper so inbox moves do not clear tags"
  - "media-views handle (not wp-media): correct WP core script handle for loading window.wp.media into global scope"

patterns-established:
  - "Pattern 1: Taxonomy-driven tagging — folder term meta drives post_tag assignment via direct static call"
  - "Pattern 2: Inbox sentinel — folder_id=0 means unassigned, mapper is skipped for inbox moves"

requirements-completed: [MOVE-01, MOVE-02, MEDIA-02]

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 04 Plan 01: Move Auto-Tag Completion Summary

**Tag-on-move PHP backend: apply_tags_for_folder replaces item post_tags with folder's wpmf_mapped_post_tags on every move, plus media-views enqueued for window.wp.media availability**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-19T21:00:00Z
- **Completed:** 2026-03-19T21:05:00Z
- **Tasks:** 2 (combined into 1 commit)
- **Files modified:** 3

## Accomplishments

- Implemented `WPMF_Tag_Mapper::apply_tags_for_folder(int $item_id, int $folder_id): void` using `get_term_meta` + `wp_set_object_terms` with append=false for replacement semantics
- Removed the commented-out `add_action('set_object_terms', ...)` hook line that would have caused recursion
- Wired the tag mapper call into `WPMF_API::move_items()` inside the success branch, guarded by `$folder_id > 0`
- Merged `media-views` into `wp_enqueue_script` dependencies via `array_merge` so `window.wp.media` is available for the Upload Item button

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: Tag mapper method, move endpoint wire-up, media-views enqueue** - `82b2932` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `includes/class-wpmf-tag-mapper.php` - Added `apply_tags_for_folder` static method; removed dead hook comment
- `includes/class-wpmf-api.php` - Added tag mapper call after successful `wp_set_object_terms` in `move_items`, guarded by `$folder_id > 0`
- `includes/class-wpmf-admin-page.php` - Merged `media-views` into enqueue dependencies

## Decisions Made

- **Direct call over hook pattern:** The hook approach (`set_object_terms` action) was already commented out in the file. The research doc confirmed this risks recursion because `move_items` calls `wp_set_object_terms` internally. Using a direct static method call from the endpoint is the correct pattern.
- **append=false for replacement semantics:** MOVE-02 requires tags to reflect the folder's mapped tags exactly. Passing `false` to `wp_set_object_terms` replaces rather than appends.
- **`media-views` not `wp-media`:** The correct WP core handle for loading `wp.media` into the global scope is `media-views`. This is not auto-detected by `@wordpress/scripts` from JS imports since Grid.js accesses it via `window.wp.media` directly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tag-on-move is now fully wired end-to-end (folder meta -> mapper -> post_tag assignment)
- The `window.wp.media` global is available on the admin page via `media-views` dependency
- Phase 04 requirements MOVE-01, MOVE-02, and MEDIA-02 are satisfied
- All three PHP files pass syntax lint (`php -l`)

---
*Phase: 04-move-auto-tag-completion*
*Completed: 2026-03-19*
