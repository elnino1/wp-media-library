# Codebase Concerns

**Analysis Date:** 2026-03-19

## Security Vulnerabilities

**Missing CSRF Protection (Nonces):**
- Issue: REST API endpoints lack WordPress nonce verification for state-changing requests
- Files: `src/api/client.js` (POST requests), `includes/class-wpmf-api.php` (REST route handlers)
- Impact: Unauthenticated CSRF attacks can trigger folder moves and item changes
- Fix approach: Add `X-WP-Nonce` header to all POST/modification requests in `src/api/client.js`. Verify nonce server-side in `includes/class-wpmf-api.php` using `check_ajax_referer()` or REST nonce verification

**Missing Input Sanitization in PHP:**
- Issue: `class-wpmf-api.php` does not sanitize folder names or item IDs before database operations
- Files: `includes/class-wpmf-api.php` lines 37-42 (move_items function)
- Impact: Malicious input could cause injection vulnerabilities or data corruption
- Fix approach: Use `sanitize_text_field()` for folder names, `absint()` for numeric IDs before term operations

**Missing Response Escaping:**
- Issue: JavaScript components display user-supplied data (folder names, file titles) without escaping
- Files: `src/components/Sidebar.js` line 27, `src/components/Grid.js` lines 16/76
- Impact: XSS vulnerability if folder/item names contain script tags
- Fix approach: Use WordPress escaping helpers or ensure React's automatic escaping is active (already in place via JSX, but term names from API should be verified)

**Missing Data Validation on Grid Load:**
- Issue: `getItems()` API call in `src/api/client.js` accepts unfiltered query parameters but doesn't validate folder_id against user permissions
- Files: `src/api/client.js` lines 16-33
- Impact: Users could potentially access media in folders they lack permission for (if folder access control is later added)
- Fix approach: Add per-folder permission checks in backend REST route; filter items by current user capability before returning

## Test Coverage Gaps

**Minimal Unit Test Coverage:**
- Files: Only `src/components/Sidebar.test.js` has tests (88 lines)
- Untested: `Grid.js`, `Inspector.js`, `src/api/client.js`, all PHP backend classes
- Risk: Breaking changes to core functionality (drag-drop, folder operations) go undetected
- Priority: **High** - Grid and Inspector handle critical user operations
- Recommendation: Add test suites for:
  - `src/components/Grid.js` - drag-drop behavior, pagination, upload handling
  - `src/components/Inspector.js` - tag mapping, term creation, save operations
  - `src/api/client.js` - API error handling, response parsing
  - PHP API routes - permission checking, term operations

**No PHP Unit Tests:**
- Files: `includes/` directory has zero test coverage
- Impact: Core server logic (permission checks, term operations) untested
- Priority: **High** - Permission bypass or data corruption risks
- Fix approach: Add `tests/` PHP tests for:
  - `WPMF_API::move_items()` - permission enforcement, error handling
  - `WPMF_Taxonomy::register_virtual_folder_taxonomy()` - taxonomy registration
  - Permission checking in `check_permissions()`

**No Integration Tests:**
- Issue: No tests verify frontend-backend interaction flows (e.g., drag item → API call → grid refresh)
- Risk: Silent failures where UI succeeds but backend fails (or vice versa)
- Priority: **Medium** - Important for user-facing workflows

## Known Bugs & Limitations

**Drag-Drop Not Filtering by Folder:**
- Issue: `getItems()` in `src/api/client.js` (line 16) always fetches from `/wp/v2/media` and ignores `folderId` parameter
- Files: `src/api/client.js` line 24, `src/components/Grid.js` line 114
- Impact: Grid displays ALL media items regardless of selected folder; folder filtering on frontend not working
- Fix approach: Modify REST query to filter by `wp_virtual_folder` taxonomy term using `tax_query` or implement backend filter

**Upload Button Does Not Actually Move Items:**
- Issue: `openWpMediaUploader()` in `src/components/Grid.js` opens WordPress media uploader but newly uploaded items are not automatically assigned to current folder
- Files: `src/components/Grid.js` lines 83-97
- Impact: Users must manually move newly uploaded items after upload completes (contradicts listed feature)
- Workaround: After upload, manually drag item to folder
- Fix approach: Detect newly uploaded items via media library state, automatically call `moveItems()` to assign them to `selectedFolderId`

**Missing Error Messages to User:**
- Issue: API errors logged only to console (e.g., `console.error()` calls) with no user-visible feedback
- Files: `src/index.js` line 29, `src/components/Sidebar.js` line 89, `src/components/Grid.js` line 30, `src/api/client.js` line 30
- Impact: Users unaware when operations fail (e.g., move fails silently, folder creation fails)
- Fix approach: Add toast/notification system; display user-facing error messages from catch blocks

**Sub-Folder Creation Parent Selection Not Preserved:**
- Issue: When creating sub-folder, parent ID passed to API but UI doesn't show which folder will be parent until after creation
- Files: `src/components/Sidebar.js` lines 132-135 (shows conditional text but no visual affordance)
- Impact: User confusion about where sub-folder will be placed
- Fix approach: Add visual indicator (breadcrumb or tree path) showing parent folder during creation

## Tech Debt

**Hard-Coded Inline Styles Throughout Frontend:**
- Issue: All React components use inline `style` objects instead of CSS classes
- Files: `src/components/Grid.js`, `src/components/Sidebar.js`, `src/components/Inspector.js`, `src/index.js`
- Impact: Difficult to maintain, no reusable styling, poor separation of concerns
- Fix approach: Migrate styles to `src/style.scss` with CSS classes; use BEM or similar naming convention

**Incomplete Tag Mapper Implementation:**
- Issue: `class-wpmf-tag-mapper.php` registers term meta but `map_folder_tags()` hook is commented out (line 9)
- Files: `includes/class-wpmf-tag-mapper.php` lines 6-13
- Impact: Tag mapping feature (phase 2 goal) not functional; meta registration alone does nothing
- Fix approach: Uncomment hook, implement `map_folder_tags()` logic to auto-apply tags when items are moved to folder

**No Error Boundary in React App:**
- Issue: No error boundary component wrapping App in `src/index.js`
- Files: `src/index.js`
- Impact: Single component error crashes entire app with white screen
- Fix approach: Add Error Boundary wrapper component that catches and displays errors gracefully

**Missing API Documentation:**
- Issue: PHP REST routes and frontend API client lack comments on request/response format
- Files: `src/api/client.js`, `includes/class-wpmf-api.php`
- Impact: Difficult for future developers or AI agents to use API correctly
- Fix approach: Add JSDoc comments to `src/api/client.js` functions; add inline documentation to PHP REST route definitions

**No Type Checking:**
- Issue: JavaScript components lack PropTypes or TypeScript definitions
- Files: All `src/components/*.js` files
- Impact: Type errors not caught until runtime; refactoring risky
- Fix approach: Add PropTypes to all components or migrate to TypeScript

## Performance Concerns

**Grid Pagination Without Virtual Scrolling:**
- Issue: All loaded items rendered in DOM simultaneously with "Load More" button
- Files: `src/components/Grid.js` lines 143-147
- Impact: Grid becomes sluggish with 100+ items; layout shift on load
- Scaling limit: ~200-300 items before noticeable slowdown
- Improvement path: Implement virtual scrolling (windowing) with library like `react-window`

**Full Folder Tree Re-fetched on Every Mount:**
- Issue: `getFolders()` called without caching; entire folder hierarchy fetched on component mount
- Files: `src/components/Sidebar.js` line 70
- Impact: Slow sidebar render with deep folder trees; unnecessary API calls
- Improvement path: Implement local caching or context provider to share folder list across components

**No Pagination on Folder List API:**
- Issue: `/wp/v2/wpmf_folders` endpoint returns all folders without pagination
- Files: `src/components/Sidebar.js` line 70 (calls `getFolders()`)
- Impact: Sites with 1000+ folders will load entire list into memory
- Improvement path: Add pagination to folder API endpoint; implement lazy loading in sidebar

**Inefficient Term Lookup in Inspector:**
- Issue: Inspector fetches all tags/categories (100 items hard limit) on mount for ID→name reverse lookup
- Files: `src/components/Inspector.js` lines 22-24
- Impact: Slow on sites with many tags/categories; limit silently cuts off available terms
- Improvement path: Change meta storage to use term names instead of IDs, or paginate term loading

## Fragile Areas

**Drag-Drop Handler Has No Validation:**
- Files: `src/index.js` lines 22-31
- Why fragile: `handleDragEnd()` trusts that `over.id` is always a valid folder ID without verification
- Safe modification: Add validation that `over.id` exists in folder tree before calling `moveItems()`
- Test coverage: No tests for drag-drop logic

**Folder Tree Building Assumes Flat Input:**
- Files: `src/components/Sidebar.js` lines 33-36
- Why fragile: `buildTree()` assumes all items have `parent` property; will crash if API returns malformed data
- Safe modification: Add defensive checks for missing `parent` or `id` properties
- Test coverage: No tests for tree building with edge cases (circular references, orphaned nodes)

**Inspector State Sync with Multiple Requests:**
- Files: `src/components/Inspector.js` lines 21-102
- Why fragile: Complex state management with multiple async operations (`Promise.allSettled`, manual cache updates) - easy to create race conditions
- Safe modification: Use `useEffect` dependency array carefully; consider reducing state complexity or using reducer pattern
- Test coverage: No tests for async flow

**Permission Check Uses Loose OR Logic:**
- Files: `includes/class-wpmf-api.php` line 33
- Why fragile: Allows access if user has `upload_files` OR `edit_products` - may be too permissive for WooCommerce-only use
- Safe modification: Add settings to restrict access per post type; make permission check configurable
- Impact: Unintended access to media operations for WooCommerce-only editors

## Missing Features Blocking Functionality

**Folder-Based Media Filtering Not Working:**
- Problem: Grid component doesn't filter items by selected folder
- Files: `src/components/Grid.js` line 114 (passes folderId to getItems but API ignores it)
- Blocks: Core feature - user cannot organize media into folders visually
- Priority: **Critical** - Feature listed in README as available

**Tag Mapping Feature Incomplete:**
- Problem: `wpmf_mapped_post_tags` and `wpmf_mapped_product_cats` stored in meta but never applied to items
- Files: `includes/class-wpmf-tag-mapper.php` (commented out hook), `src/components/Inspector.js` (saves but doesn't apply)
- Blocks: "Smart Tag Mapping" feature listed in README, phase 2 goal
- Priority: **Critical** - Phase 02 marked complete but feature not fully implemented

## Dependencies at Risk

**@dnd-kit Library Major Version Outdated:**
- Risk: Using v6.1.0 (package.json line 17) - v8+ available with breaking changes
- Impact: Library abandoned by maintainers; security fixes not backported
- Migration plan: Upgrade to latest `@dnd-kit` major version (test drag-drop thoroughly); or consider switching to `react-beautiful-dnd` if dnd-kit becomes unmaintained

**No Security Audit of WordPress REST Endpoints:**
- Risk: Custom REST routes don't follow all WordPress security best practices
- Files: `includes/class-wpmf-api.php`
- Impact: Potential vulnerabilities in permission checking, input validation, response format
- Recommendation: Audit against [WordPress REST API security docs](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/); add proper nonce handling, sanitization, and capability checks

## Scaling Limits

**Single Taxonomy for Both Attachments and Products:**
- Current: Both `attachment` and `product` post types use same `wp_virtual_folder` taxonomy (line 39, `class-wpmf-taxonomy.php`)
- Limit: Folder names must be unique across both post types; query optimization difficult
- Scaling path: Consider separate taxonomies (`wp_virtual_folder_attachment` and `wp_virtual_folder_product`) if WooCommerce catalog grows to 10k+ products

**No Caching of Folder Hierarchy:**
- Current: Folder tree computed on every render by `buildTree()`
- Limit: With 500+ nested folders, tree building becomes O(n²) operation
- Scaling path: Memoize tree building result; cache at component level or use context provider

---

*Concerns audit: 2026-03-19*
