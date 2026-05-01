# Phase 03: Folder Navigation & Media Filtering - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can navigate the folder hierarchy and see only the media that belongs to the selected folder. Inbox (root) shows only unassigned media. Sub-folders can be created under any selected folder.

This phase does NOT include: drag-to-move, auto-tagging, Inspector tag mapping, or upload button (those are Phase 04).

</domain>

<decisions>
## Implementation Decisions

### Sub-folder creation UX
- Keep the current approach: select a folder, then click "+ New Folder (sub)" at bottom of sidebar
- No per-row + buttons or right-click context menus — implicit creation under selected folder is sufficient
- After creation, **selection stays on the parent folder** (not the new sub-folder) — the new folder is empty and showing an empty grid immediately would be jarring

### Tree collapse/expand
- Folders with children are collapsible (click to toggle)
- Default state on page load: all folders expanded
- When a new sub-folder is created, the parent folder auto-expands to reveal it (even if it was collapsed)

### Claude's Discretion
- Exact collapse/expand icon (chevron, triangle, etc.)
- Animation on expand/collapse (subtle preferred)
- How to handle very deep nesting (3+ levels) visually
- Loading/skeleton state while folders fetch
- Empty state text for sidebar (no folders yet) and grid (folder is empty)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Core value, constraints, out-of-scope items
- `.planning/REQUIREMENTS.md` — FOLD-01, FOLD-02, MEDIA-01 acceptance criteria

### Existing code to modify
- `src/components/Sidebar.js` — Folder tree rendering, creation UI, `buildTree()` utility
- `src/api/client.js` — `getItems()` (currently ignores folderId — must fix), `getFolders()`
- `src/components/Grid.js` — Media grid rendering, pagination
- `includes/class-wpmf-api.php` — REST endpoints (may need folder-filtered media endpoint)
- `includes/class-wpmf-taxonomy.php` — Taxonomy registration (check if WP REST media filtering is possible via query var)

### Architecture reference
- `_bmad-output/architecture/plugin-architecture.md` — System design overview
- `.planning/codebase/ARCHITECTURE.md` — Component relationships and data flow
- `.planning/codebase/CONCERNS.md` — Known bugs and fragile areas (buildTree fragility, getItems blocker)

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildTree(folders, parentId)` in `Sidebar.js` — recursive flat→tree builder, reuse as-is
- `FolderItem` component in `Sidebar.js` — single droppable row with depth-based indentation
- `FolderTree` component in `Sidebar.js` — recursive renderer, needs collapse/expand state added
- `getFolders()` in `client.js` — fetches flat folder list from `/wp/v2/wpmf_folders`
- `getItems()` in `client.js` — needs `folderId` param wired through to the backend query

### Established Patterns
- State lifting: `selectedFolderId` lives in `App` (index.js) and passed down as props — keep this pattern
- Async with try/catch/finally: used in all handlers (`handleCreate`, `handleDragEnd`) — follow same pattern
- `apiFetch` with `@wordpress/api-fetch` — standard for all REST calls, don't switch to fetch
- dnd-kit `useDroppable` already applied to `FolderItem` — drag targets already wired

### Integration Points
- `getItems(folderId, page)` in `client.js` receives `selectedFolderId` from `Grid.js` props — the param is passed but the API call ignores it; fix here + backend
- `onSelectFolder` callback in `App` → `Sidebar` → triggers `Grid` to reload via `refreshKey` and `selectedFolderId` — this flow already exists
- Inbox is `selectedFolderId === null` — the filtering logic branch is already in Grid/index

### Known Blocker
- `getItems()` uses `/wp/v2/media` with no taxonomy filter. WP REST API for media does not natively support custom taxonomy filtering. Backend must either:
  a. Register a custom `GET /wpmf/v1/items?folder_id=X` endpoint, OR
  b. Hook into `rest_media_query` filter to inject `tax_query` when `folder_id` param is present
  The planner should decide which approach fits the existing architecture better.

</code_context>

<specifics>
## Specific Ideas

- Keep sidebar look and feel consistent with current design — depth indentation already works
- Parent stays selected after sub-folder creation (user's explicit preference — don't change)
- Expand parent automatically when a new child is created

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-folder-navigation-media-filtering*
*Context gathered: 2026-03-19*
