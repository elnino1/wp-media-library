---
phase: 04
slug: move-auto-tag-completion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (via @wordpress/scripts) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `./node_modules/.bin/wp-scripts test-unit-js --no-coverage` |
| **Full suite command** | `./node_modules/.bin/wp-scripts test-unit-js --no-coverage` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `./node_modules/.bin/wp-scripts test-unit-js --no-coverage`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 04-01-01 | 01 | 1 | MOVE-02 | grep | `grep "map_folder_tags\|apply_tags" includes/class-wpmf-tag-mapper.php` | ⬜ pending |
| 04-01-02 | 01 | 1 | MOVE-02 | grep | `grep "map_folder_tags\|tag_mapper" includes/class-wpmf-api.php` | ⬜ pending |
| 04-02-01 | 02 | 1 | MAP-01, MAP-02 | unit | `./node_modules/.bin/wp-scripts test-unit-js --no-coverage --testPathPattern="Inspector"` | ⬜ pending |
| 04-03-01 | 03 | 1 | MEDIA-02 | grep | `grep "wp-media\|wp_enqueue" includes/class-wpmf-admin-page.php` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test stubs needed — Phase 04 fixes are verified by:
- Updated grep checks on PHP files (tag mapper wiring)
- Updated Inspector.test.js tests (race condition fix)
- Existing test suite remains green throughout

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag media onto folder moves it out of current view | MOVE-01 | Requires running WP env + browser | Start wp-env, open media library, drag item onto folder, verify item disappears from Inbox |
| Moved item's WP tags match folder mappings | MOVE-02 | Requires WP database | After drag-move, check post_tag taxonomy on item via wp admin |
| Upload button opens WP media uploader modal | MEDIA-02 | Requires browser + WP media frame | Click Upload Item button, verify wp.media modal opens |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
