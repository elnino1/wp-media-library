# Phase 04: Move & Auto-Tag Completion — Research

**Researched:** 2026-03-19
**Domain:** WordPress taxonomy term operations, PHP REST API extension, React drag-and-drop, wp.media uploader
**Confidence:** HIGH (all findings verified against live source code)

---

## Summary

Phase 04 completes the core product value: dragging a media item onto a folder applies the folder's mapped WP tags to that item automatically. Every piece of scaffolding exists already. The work is four discrete wiring tasks: (1) implement `map_folder_tags()` in the PHP tag mapper and uncomment the hook so it fires after every move, (2) wire the move endpoint to call the tag mapper, (3) fix a race condition in Inspector that prevents the "Saved!" status from persisting, and (4) verify that `wp.media` is already scaffolded in `Grid.js` (it is).

The move endpoint (`POST /wpmf/v1/move`) calls `wp_set_object_terms()` correctly but stops there — it never applies the folder's mapped post tags to the moved items. `class-wpmf-tag-mapper.php` has the hook for this commented out on line 9 and the implementation body is entirely absent. The meta structure is confirmed: `wpmf_mapped_post_tags` stores integer tag IDs in term meta on the `wp_virtual_folder` term. After moving an item, tags must be applied using `wp_set_object_terms($item_id, $tag_ids, 'post_tag')` with the `append = false` flag to replace rather than add.

Inspector already fetches folder meta and does the ID→name reverse-lookup correctly via `termCache`. The bug is a race condition: `setTermCache` is called with a new object reference even when no new terms were created, which triggers the folder-load `useEffect`, which resets `saveStatus` to `''` right after `handleSave` sets it to `'Saved!'`. The fix is to only call `setTermCache(updatedCache)` when the cache actually gained new entries.

**Primary recommendation:** Implement `map_folder_tags()` in PHP, call it from `move_items()`, and fix the termCache reference churn in Inspector. Everything else (drag-drop, wp.media uploader, meta storage) is already working or scaffolded.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOVE-01 | User can drag a media item and drop it onto a folder to move it | Drag-drop is wired end-to-end: `handleDragEnd` in App calls `moveItems`, endpoint calls `wp_set_object_terms`. Needs verification that `over.id` in `handleDragEnd` correctly maps to folder term IDs exposed by `useDroppable`. |
| MOVE-02 | When an item is moved to a folder, the folder's mapped WP tags replace the item's existing tags | Requires implementing `map_folder_tags()` in `WPMF_Tag_Mapper` and calling it from `move_items()` in `WPMF_API`. Use `wp_set_object_terms($item_id, $tag_ids, 'post_tag', false)` — `false` = replace not append. |
| MAP-01 | User can set which WP tags a folder maps to via the Inspector panel | Already implemented: Inspector `handleSave` creates new tags and saves IDs to `wpmf_mapped_post_tags` meta. Race condition bug must be fixed so the "Saved!" confirmation persists visibly. |
| MAP-02 | Inspector shows the folder's existing tag mappings when a folder is selected | Already implemented: the folder-load `useEffect` fetches `/wp/v2/wpmf_folders/{folderId}`, reads `wpmf_mapped_post_tags`, and reverses IDs to names via `termCache`. Works correctly after race condition fix. |
| MEDIA-02 | Upload button opens the WP media uploader | Already scaffolded in `Grid.js` lines 83-97. `openWpMediaUploader(onRefresh)` calls `window.wp.media()` and fires `onRefresh` on `select`. The `wp-media` script handle must be enqueued in `class-wpmf-admin-page.php` for `window.wp.media` to be available. |
</phase_requirements>

---

## Standard Stack

### Core (all already in the project)
| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| `wp_set_object_terms()` | WP core | Assign taxonomy terms to a post | Native WP function; handles term creation, relationships, and cache invalidation atomically |
| `get_term_meta()` | WP core | Read `wpmf_mapped_post_tags` from folder term | Native WP meta API; backed by registered schema from `register_term_meta` |
| `@dnd-kit/core` | 6.1.0 | Drag-and-drop DnD context, `useDraggable`, `useDroppable` | Already in use; `handleDragEnd` already calls `moveItems` |
| `wp.media` (jQuery) | WP core | Open native WordPress media uploader | Included in WordPress core; available as `window.wp.media` when `wp-media` handle is enqueued |
| `@wordpress/api-fetch` | WP core | Authenticated REST calls from React | Already in use throughout frontend |

### Supporting
| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| `wp_set_object_terms($id, [], 'post_tag', false)` | WP core | Clear all tags from item | When `folder_id === 0` (moving to inbox should optionally clear tags) |
| `rest_ensure_response()` | WP core | Wrap PHP responses for REST API | Already used in `move_items()`; continue same pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `wp_set_object_terms(..., false)` | `wp_set_object_terms(..., true)` | `true` = append, `false` = replace. Phase requires REPLACE (MOVE-02 says "replacing any previous tags") — must use `false` |
| Hook `set_object_terms` action | Call mapper directly from `move_items()` | Hook is fired for every `wp_set_object_terms` call anywhere in WP, including folder-term assignment itself — risk of infinite recursion or unintended double-tagging. Direct call from `move_items()` is safer and more explicit. |
| `wp.media` frame | Custom `<input type="file">` | `wp.media` gives native WP uploader with folder context, multiple file support, and upload progress. Custom input loses all WP media library features. |

---

## Architecture Patterns

### Recommended Project Structure (no changes needed)
```
includes/
├── class-wpmf-tag-mapper.php   # Add map_folder_tags() method here
├── class-wpmf-api.php          # Call WPMF_Tag_Mapper::map_folder_tags() after wp_set_object_terms
└── class-wpmf-admin-page.php   # Add 'wp-media' to enqueue dependencies

src/components/
├── Inspector.js                # Fix termCache reference churn (race condition)
└── Grid.js                     # wp.media uploader already scaffolded — verify enqueue
```

### Pattern 1: Tag Mapper — Direct Call from Move Endpoint
**What:** After `wp_set_object_terms()` assigns the folder, `move_items()` calls `WPMF_Tag_Mapper::apply_tags_for_folder($item_id, $folder_id)` directly. The mapper reads `wpmf_mapped_post_tags` from the folder term meta and calls `wp_set_object_terms($item_id, $tag_ids, 'post_tag', false)`.

**When to use:** Any time a media item is assigned to a folder. The `false` (append=false) ensures previous tags are fully replaced, satisfying MOVE-02.

**Example (PHP pattern — verified against WP core docs):**
```php
// In WPMF_Tag_Mapper
public static function apply_tags_for_folder( int $item_id, int $folder_id ): void {
    $tag_ids = get_term_meta( $folder_id, 'wpmf_mapped_post_tags', true );
    if ( empty( $tag_ids ) || ! is_array( $tag_ids ) ) {
        return;
    }
    // append=false replaces existing tags rather than adding to them
    wp_set_object_terms( $item_id, $tag_ids, 'post_tag', false );
}
```

**Call site in `WPMF_API::move_items()`:**
```php
// After wp_set_object_terms assigns the folder successfully:
if ( ! is_wp_error( $status ) ) {
    if ( $folder_id > 0 ) {
        WPMF_Tag_Mapper::apply_tags_for_folder( $item_id, $folder_id );
    }
    $results[] = array( 'id' => $item_id, 'status' => 'success' );
}
```

### Pattern 2: Inspector termCache Race Condition Fix
**What:** `handleSave` currently calls `setTermCache(updatedCache)` unconditionally. Because `{ ...termCache }` is a new object reference even when no new terms were added, this triggers the `useEffect([folderId, termCache])` which re-fetches folder data and calls `setSaveStatus('')`, clearing the "Saved!" message.

**Fix:** Only update termCache when new entries were actually added.

```javascript
// In Inspector.js handleSave — replace the unconditional setTermCache call:
const hasNewTerms = results.some(r => r.status === 'fulfilled');
if (hasNewTerms) {
    setTermCache(updatedCache);
}
// ...then proceed with tagIds/catIds lookup and meta save
```

**This is confirmed by the comment block at line 268-286 of `Inspector.test.js`**, which documents the exact bug and root cause.

### Pattern 3: wp.media Enqueue Dependency
**What:** `window.wp.media` is only available when WordPress enqueues the `wp-media` script handle. The uploader code in `Grid.js` (lines 83-97) guards with `if (!window.wp || !window.wp.media)` and logs a warning when unavailable.

**Verification needed:** `class-wpmf-admin-page.php::enqueue_scripts()` must include `'wp-media'` in the `$deps` array passed to `wp_enqueue_script()`.

### Anti-Patterns to Avoid
- **Using `set_object_terms` action hook to trigger tag mapping:** Fires for every term assignment in WordPress, including the folder assignment itself. This creates a re-entrant situation where applying tags triggers the hook again. Call mapper directly from `move_items()` after the folder assignment succeeds.
- **Using `append=true` for tag replacement:** Calling `wp_set_object_terms($item_id, $tag_ids, 'post_tag', true)` adds tags but does not remove previous ones. MOVE-02 requires replacement — must use `false`.
- **Storing tag names instead of IDs in term meta:** The existing schema stores integer IDs (`'type' => 'integer'` in `register_term_meta`). The Inspector already resolves IDs to names via `termCache`. Do not change the storage format — it would break the existing reverse-lookup code.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Replacing tags on a post | Custom DB query to delete and re-insert taxonomy relationships | `wp_set_object_terms($id, $ids, 'post_tag', false)` | WP core handles object term cache invalidation, term counts, and relationship table atomically |
| Reading term meta | `$wpdb->get_var(...)` query | `get_term_meta($term_id, 'wpmf_mapped_post_tags', true)` | Already registered via `register_term_meta`; WP meta cache handles repeated reads |
| Media uploader UI | Custom file input + AJAX upload | `window.wp.media()` frame | Gives WP's native uploader with progress bars, multi-file, image cropping, and existing media library browser for free |
| nonce in REST headers | Manual header building | `apiFetch` with `@wordpress/api-fetch` (already in use) | `apiFetch` automatically adds `X-WP-Nonce` from `wpApiSettings.nonce` when the WP scripts are loaded |

**Key insight:** Every primitive needed for Phase 04 already exists in WP core. The work is exclusively wiring — no custom data structures, storage formats, or HTTP clients needed.

---

## Common Pitfalls

### Pitfall 1: append=true vs append=false in wp_set_object_terms
**What goes wrong:** Calling `wp_set_object_terms($item_id, $tag_ids, 'post_tag')` (default `append=false` is actually the default) but confusing the parameter order, or accidentally passing `true` for append. Items accumulate tags from every folder they've ever been moved through instead of having tags replaced.
**Why it happens:** The function signature is `wp_set_object_terms($object_id, $terms, $taxonomy, $append = false)`. The parameter is easy to overlook.
**How to avoid:** Explicitly pass `false` as the fourth argument every time. Do not rely on the default — make intent clear in code.
**Warning signs:** Items in folders have more tags than the folder's mapping specifies.

### Pitfall 2: Mapping tags when folder_id === 0 (inbox/root)
**What goes wrong:** If `move_items()` calls `apply_tags_for_folder()` when `folder_id === 0`, `get_term_meta(0, ...)` returns empty/falsy, causing a no-op or error. But the underlying behavior question is: should moving to inbox clear all tags?
**Why it happens:** The code already handles `folder_id === 0` for the folder assignment (calls `wp_set_object_terms($item_id, [], 'wp_virtual_folder')`). The tag mapper call must be skipped for `folder_id === 0`.
**How to avoid:** Guard with `if ( $folder_id > 0 )` before calling the mapper.
**Warning signs:** PHP notice "Invalid term ID" or unexpected tag clearing when moving to inbox.

### Pitfall 3: termCache out-of-sync causing IDs to show instead of names in Inspector
**What goes wrong:** When a folder is loaded, `wpmf_mapped_post_tags` contains integer IDs. The reverse-lookup `cacheById[entry.id] = name` only covers the 100-item fetch from `/wp/v2/tags?per_page=100`. If the folder has a tag ID that is not in the first 100 tags, the input shows the raw integer instead of the tag name.
**Why it happens:** Hard limit of `per_page=100` on the initial tag fetch in the `useEffect` (Inspector.js line 23).
**How to avoid:** For Phase 04, this is a known limitation (documented in CONCERNS.md as "Inefficient Term Lookup in Inspector"). It is out of scope for this phase — the existing behavior is acceptable for MVP. Do not change the storage format to names to work around it.
**Warning signs:** Inspector input shows integers like "42, 17" instead of tag names after saving and reloading.

### Pitfall 4: wp.media not available — silent no-op on upload button
**What goes wrong:** Clicking the upload button does nothing because `window.wp.media` is `undefined`. The guard in `openWpMediaUploader` logs a console warning but gives no user feedback.
**Why it happens:** `wp-media` script handle is not in the `$deps` array for `wp_enqueue_script()` in `class-wpmf-admin-page.php`.
**How to avoid:** Add `'wp-media'` to the dependency array in `enqueue_scripts()`.
**Warning signs:** Console shows "wp.media not available" when clicking Upload Item button.

### Pitfall 5: Inspector race condition persists if fix is incomplete
**What goes wrong:** "Saved!" confirmation message disappears immediately. This is documented in `Inspector.test.js` lines 268-286 with full root cause analysis.
**Why it happens:** `setTermCache({ ...termCache })` always creates a new object reference, triggering `useEffect([folderId, termCache])`, which re-fetches folder data and calls `setSaveStatus('')`.
**How to avoid:** Only call `setTermCache(updatedCache)` when `results` contains at least one fulfilled new term creation. If no new terms were created, the cache is unchanged — do not re-assign it.
**Warning signs:** Test: `Inspector.test.js` would fail a "Saved! persists" assertion if one were added.

---

## Code Examples

Verified patterns from source code and WP core:

### wp_set_object_terms — replace tags (WP core)
```php
// Source: WordPress core function signature, verified against codex pattern
// $append = false means REPLACE existing terms, not add to them
$result = wp_set_object_terms( $item_id, $tag_ids, 'post_tag', false );
if ( is_wp_error( $result ) ) {
    error_log( 'WPMF: failed to apply tags to item ' . $item_id . ': ' . $result->get_error_message() );
}
```

### get_term_meta — read folder's mapped tags
```php
// Source: class-wpmf-tag-mapper.php register_meta() — confirmed schema is array of integers
$tag_ids = get_term_meta( $folder_id, 'wpmf_mapped_post_tags', true );
// Returns [] when no mapping set (single=true returns '' for missing, but registered default is array)
// Defensive check:
if ( ! is_array( $tag_ids ) || empty( $tag_ids ) ) {
    return; // nothing to apply
}
```

### WPMF_API::move_items() — call site for tag mapper
```php
// Source: includes/class-wpmf-api.php lines 56-67 — existing structure
if ( ! is_wp_error( $status ) ) {
    // Apply folder tag mappings after successful move (MOVE-02)
    if ( $folder_id > 0 ) {
        WPMF_Tag_Mapper::apply_tags_for_folder( $item_id, $folder_id );
    }
    $results[] = array( 'id' => $item_id, 'status' => 'success' );
} else {
    $results[] = array( 'id' => $item_id, 'status' => 'error', 'message' => $status->get_error_message() );
}
```

### Inspector.js — termCache race condition fix
```javascript
// Source: Inspector.js lines 89-103 + Inspector.test.js lines 268-286
// Only update termCache when new entries were added — avoids re-triggering useEffect
const newEntries = results.filter(r => r.status === 'fulfilled');
if (newEntries.length > 0) {
    setTermCache(updatedCache);
}
// Proceed with ID lookup using updatedCache (not state — state is async)
const tagIds = tagNames.map((name) => updatedCache[name]?.id).filter(Boolean);
const catIds = catNames.map((name) => updatedCache[name]?.id).filter(Boolean);
```

### wp.media enqueue dependency
```php
// Source: class-wpmf-admin-page.php enqueue_scripts() — add 'wp-media' to deps array
wp_enqueue_script(
    'wp-media-folders',
    plugins_url( 'build/index.js', dirname( __FILE__ ) ),
    array( 'wp-element', 'wp-api-fetch', 'wp-url', 'wp-components', 'wp-media' ), // add wp-media
    filemtime( plugin_dir_path( dirname( __FILE__ ) ) . 'build/index.js' ),
    true
);
```

### Inspector.js — existing folder-load effect (works correctly after race fix)
```javascript
// Source: Inspector.js lines 36-58 — already correct; depends on [folderId, termCache]
// The reverse-lookup cacheById is built from termCache entries:
const cacheById = {};
Object.entries(termCache).forEach(([name, entry]) => {
    cacheById[entry.id] = name;
});
setTagInput(tagIds.map((id) => cacheById[id] || id).join(', '));
// Falls back to raw ID string if term not in cache (known limitation, out of scope)
```

---

## State of the Art

| Old Approach | Current Approach | Applies Here |
|--------------|------------------|--------------|
| `set_object_terms` action hook | Direct method call from endpoint | Use direct call — safer for this codebase (see Anti-Patterns above) |
| `wp_create_term()` then assign | `wp_set_object_terms()` with term IDs | Already using IDs correctly; continue |
| `wp.media` legacy (pre WP 3.5) | `window.wp.media({ ... })` frame API | Already using modern frame API in Grid.js |

**Deprecated/outdated:**
- `wp_set_post_tags()`: Wrapper around `wp_set_object_terms()` for `post_tag` taxonomy specifically. Works but is a thin wrapper — using `wp_set_object_terms()` directly is more explicit and consistent with the existing folder-assignment code.

---

## Open Questions

1. **Should moving an item to inbox (folder_id = 0) clear its tags?**
   - What we know: Currently, moving to folder_id=0 clears the folder assignment (`wp_set_object_terms($id, [], 'wp_virtual_folder')`). The requirements say "folder's mapped tags replace item's existing tags" (MOVE-02) — this only applies when there's a target folder.
   - What's unclear: Whether inbox should also clear tags (i.e., inbox implies "unorganized = untagged").
   - Recommendation: Do NOT clear tags on move-to-inbox in Phase 04. MOVE-02 specifies folder-mapped tags, not inbox behavior. Treat inbox as a folder-unassignment only.

2. **Does `wp-media` need to be enqueued or is it already a WP core global?**
   - What we know: `window.wp.media` requires the `wp-media` JavaScript handle to be loaded. WordPress only loads it on pages that explicitly enqueue it (media library admin page loads it by default; custom admin pages do not).
   - What's unclear: Whether the current `enqueue_scripts()` already includes `wp-media` in its deps.
   - Recommendation: Audit `class-wpmf-admin-page.php::enqueue_scripts()` as the first task — add `'wp-media'` if absent. This is a one-line change.

---

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| JS Framework | Jest via `@wordpress/scripts` (jest-preset-default) |
| JS Config file | `jest.config.js` (exists, uses `@wordpress/jest-preset-default`) |
| PHP Framework | PHPUnit via `wp-env` |
| PHP bootstrap | `tests/bootstrap.php` (exists) |
| JS quick run | `npm run test:unit -- --testPathPattern=Inspector` |
| JS full suite | `npm run test:unit` |
| PHP full suite | `npm run test:php` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOVE-01 | Dragging item onto folder calls `moveItems([id], folderId)` | unit (JS) | `npm run test:unit -- --testPathPattern=App` | No — Wave 0 |
| MOVE-02 | After move, item's WP post tags match exactly the folder's mapped tags | unit (PHP) | `npm run test:php` | Partial (WpmfApiTest.php exists but has no move+tag test) |
| MAP-01 | Inspector handleSave POSTs tag IDs to folder meta | unit (JS) | `npm run test:unit -- --testPathPattern=Inspector` | Yes — Inspector.test.js |
| MAP-02 | Inspector loads and displays existing tag names when folder changes | unit (JS) | `npm run test:unit -- --testPathPattern=Inspector` | Partial — test covers mock meta loading but not the "names display" assertion |
| MEDIA-02 | Clicking Upload Item calls `window.wp.media()` | unit (JS) | `npm run test:unit -- --testPathPattern=Grid` | Partial (Grid.test.js exists but only tests empty states, not upload) |

### Sampling Rate
- **Per task commit:** `npm run test:unit -- --testPathPattern={changed-component}`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** `npm run test:unit && npm run test:php` — full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/App.test.js` — covers MOVE-01: handleDragEnd calls `moveItems` with correct args; `over.id` is a valid folder term ID
- [ ] `tests/WpmfApiTest.php` — add test methods: `test_move_applies_folder_tags()`, `test_move_replaces_not_appends_tags()`, `test_move_to_inbox_skips_tag_mapper()`
- [ ] `src/components/Inspector.test.js` — add test: "loads and renders existing tag names when folder selected and tags exist in termCache" (MAP-02 display assertion)
- [ ] `src/components/Grid.test.js` — add test: "Upload Item button calls wp.media when window.wp.media is available" (MEDIA-02)
- [ ] `src/components/Inspector.test.js` — add test: "Saved! message persists after save when no new terms are created" (validates race condition fix)

---

## Sources

### Primary (HIGH confidence)
- `includes/class-wpmf-tag-mapper.php` — lines 7-9 confirm hook is commented out; method body is absent; `register_meta` confirms `wpmf_mapped_post_tags` stores integer arrays
- `includes/class-wpmf-api.php` — lines 36-71 confirm `move_items()` calls `wp_set_object_terms()` for folder assignment but never calls tag mapper
- `src/components/Inspector.js` — lines 36-58 confirm folder-load effect reads `wpmf_mapped_post_tags` and reverse-looks up via termCache; lines 89-103 confirm the unconditional `setTermCache()` call that causes the race condition
- `src/components/Grid.js` — lines 83-97 confirm `window.wp.media()` is already scaffolded
- `src/index.js` — lines 22-31 confirm `handleDragEnd` calls `moveItems([active.id], over.id)` and then `refreshGrid()`
- `src/components/Inspector.test.js` — lines 268-286: authoritative race condition bug description written during prior test-generation session
- `.planning/codebase/ARCHITECTURE.md` — confirms meta key names, data flow, and term ID storage decision (Phase 02 decision recorded in STATE.md)
- `.planning/STATE.md` — confirms two Phase 04 blockers: commented-out hook, move endpoint not calling mapper

### Secondary (MEDIUM confidence)
- WordPress Codex pattern for `wp_set_object_terms($object_id, $terms, $taxonomy, $append)` — `append=false` for replace behavior. Consistent with WP core source behavior.
- `wp.media` frame API (`window.wp.media({ title, button, multiple })`) — standard WP media uploader pattern used since WP 3.5. Scaffolded correctly in Grid.js.

### Tertiary (LOW confidence)
- None — all findings verified against live source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in live source files
- Architecture: HIGH — wiring points confirmed line-by-line in PHP and JS
- Pitfalls: HIGH — race condition has verbatim documentation in test file; WP term API behavior is stable
- Validation: HIGH — test framework files and existing test patterns verified

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable WP core APIs; React component code unlikely to change before phase starts)
