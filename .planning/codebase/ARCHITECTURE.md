# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Hybrid WordPress plugin with decoupled frontend and backend. Uses a React SPA frontend communicating with a custom REST API backend that leverages WordPress's native taxonomy system.

**Key Characteristics:**
- Non-destructive virtual folders mapped to WordPress custom taxonomy (`wp_virtual_folder`)
- REST API-driven communication between React frontend and PHP backend
- Drag-and-drop interface powered by `@dnd-kit` for visual organization
- Supports both WordPress media and WooCommerce products
- Desktop-class dual-pane UI (Sidebar + Grid + Inspector)

## Layers

**Presentation Layer (Frontend React):**
- Purpose: Desktop-class visual interface for folder management and media organization
- Location: `src/components/`, `src/index.js`
- Contains: React components for Sidebar, Grid, Inspector; drag-and-drop logic
- Depends on: WordPress element library, @dnd-kit for drag-and-drop
- Used by: WordPress admin page rendered via PHP

**API Client Layer:**
- Purpose: Abstracts all HTTP communication between frontend and backend
- Location: `src/api/client.js`
- Contains: Functions for folder management, item movement, media queries
- Depends on: WordPress API Fetch, WordPress URL utilities
- Used by: React components for data operations

**Plugin Bootstrap Layer (PHP):**
- Purpose: Initializes all plugin components and hooks into WordPress lifecycle
- Location: `wp-media-folders.php`, `includes/class-wpmf-autoloader.php`
- Contains: Plugin constants, autoloading mechanism, initialization trigger
- Depends on: WordPress core hooks
- Used by: WordPress core on plugin activation

**Business Logic Layer (PHP):**
- Purpose: Core domain logic for folder taxonomy, API endpoints, and UI rendering
- Location: `includes/` directory
- Contains: WPMF_Taxonomy, WPMF_API, WPMF_Tag_Mapper, WPMF_Admin_Page classes
- Depends on: WordPress REST API, WordPress taxonomy system
- Used by: Autoloader and WordPress hooks

## Data Flow

**Initial Page Load:**

1. User navigates to "Media Folders" admin page
2. `WPMF_Admin_Page::add_admin_menu()` registers the menu item
3. When page is accessed, `enqueue_scripts()` loads the React bundle and dependencies
4. React app mounts to `#wpmf-app-root` div in `render_app()`
5. App component initializes with default state (selectedFolderId = null, gridRefreshKey = 0)

**Folder Listing:**

1. Sidebar component mounts → calls `getFolders()` API
2. API Client uses WordPress REST endpoint `/wp/v2/wpmf_folders`
3. REST API returns flat array of folder terms with parent IDs
4. `buildTree()` function converts flat structure to nested hierarchy
5. `FolderTree` component renders recursively with depth-based indentation

**Item Movement (Drag-and-Drop):**

1. User drags media item onto folder (or root)
2. `handleDragEnd()` in App extracts `active.id` (media item) and `over.id` (target folder)
3. Calls `moveItems([itemId], folderId)` API
4. API Client POSTs to `/wpmf/v1/move` with item_ids and folder_id
5. `WPMF_API::move_items()` validates permissions via `check_permissions()`
6. For each item, calls `wp_set_object_terms()` to assign term to `wp_virtual_folder` taxonomy
7. Returns success/error status for each item
8. Frontend calls `refreshGrid()` to reload items in current folder

**Grid Item Loading:**

1. Grid component watches `selectedFolderId` and `refreshKey` dependencies
2. On change, resets pagination state and loads page 1
3. Calls `getItems(selectedFolderId, page, perPage)` — null maps to inbox, positive int to folder
4. API client adds `wpmf_folder=inbox` (if null) or `wpmf_folder={id}` (if folder selected) to query args
5. WordPress `rest_attachment_query` filter intercepts request and injects `tax_query`:
   - `inbox`: NOT EXISTS operator (media with no wp_virtual_folder term)
   - Folder ID: term_id match on specific folder term
6. Returns filtered array of media items with metadata (thumbnails, title, media_type)
7. `MediaItem` component renders each with drag handle and thumbnail
8. Empty state shows contextual message: inbox vs folder
9. Pagination: "Load More Items" button increments page and appends results

**Tag Mapping (Inspector):**

1. User selects folder → Inspector loads mapping metadata
2. Fetches folder via `/wp/v2/wpmf_folders/{folderId}`
3. Reads folder meta: `wpmf_mapped_post_tags` and `wpmf_mapped_product_cats` (arrays of term IDs)
4. User types comma-separated tag/category names
5. On save, Inspector detects new names not in termCache
6. Creates missing tags via `/wp/v2/tags` POST
7. Creates missing categories via `/wp/v2/categories` POST
8. Updates folder meta with all term IDs via `POST /wp/v2/wpmf_folders/{folderId}`
9. Display save status to user

**State Management:**

App-level state (holds truth for entire interface):
- `selectedFolderId`: Currently selected folder in sidebar (null = root/inbox)
- `gridRefreshKey`: Counter to force Grid remount and reload items

Component-level state:
- Sidebar: `folders` (folder tree), `isCreating`, `newFolderName`
- Grid: `items` (current page items), `page`, `loading`, `hasMore`
- Inspector: `tagInput`, `catInput`, `termCache`, `isSaving`, `saveStatus`

Data flows down props, events bubble up via callbacks (e.g., `onSelectFolder`).

## Key Abstractions

**Folder Model:**
- Purpose: Represents a virtual folder (term in `wp_virtual_folder` taxonomy)
- Examples: API returns `{ id, name, parent, meta { wpmf_mapped_post_tags, wpmf_mapped_product_cats } }`
- Pattern: Stored in WordPress as a hierarchical term; accessed via REST as JSON

**Media Item Model:**
- Purpose: Represents a draggable media attachment or product
- Examples: `{ id, title { rendered }, media_type, media_details { sizes { thumbnail { source_url } } }, source_url }`
- Pattern: Flat structure from WordPress REST API; rendered as card with thumbnail and title

**DragDrop Context:**
- Purpose: Provides drag-and-drop coordination across sidebar and grid
- Examples: Sidebar folders and Grid items register via `useDroppable()` and `useDraggable()`
- Pattern: `@dnd-kit` sensors detect pointer movement, call `onDragEnd()` callback in App

**REST Routes:**
- Purpose: Atomic endpoints designed for agent-ready API consumption
- Examples: `/wpmf/v1/move` (POST), `/wp/v2/wpmf_folders` (GET/POST), `/wp/v2/media` (GET)
- Pattern: Use WordPress native REST infrastructure; custom routes registered via `register_rest_route()`

## Entry Points

**Admin Page:**
- Location: `includes/class-wpmf-admin-page.php::add_admin_menu()`
- Triggers: WordPress admin_menu hook on every admin page load
- Responsibilities: Register menu item, check capabilities, render root div for React app

**Script Enqueuing:**
- Location: `includes/class-wpmf-admin-page.php::enqueue_scripts()`
- Triggers: WordPress admin_enqueue_scripts hook (selective via hook slug check)
- Responsibilities: Load React bundle, dependencies, and CSS only on plugin page

**React App Initialization:**
- Location: `src/index.js` DOMContentLoaded listener
- Triggers: Browser loads and parses JavaScript file
- Responsibilities: Mount App component to `#wpmf-app-root`, initialize drag context

**REST Routes:**
- Location: `includes/class-wpmf-api.php::register_routes()`
- Triggers: WordPress rest_api_init hook during REST initialization
- Responsibilities: Register `/wpmf/v1/move` and leverage built-in `/wp/v2/wpmf_folders` routes

**Taxonomy Registration:**
- Location: `includes/class-wpmf-taxonomy.php::register_virtual_folder_taxonomy()`
- Triggers: WordPress init hook on every page load
- Responsibilities: Register `wp_virtual_folder` taxonomy with REST support

## Error Handling

**Strategy:** Fail-gracefully with console logging and user feedback

**Patterns:**

- **API Failures:** API client functions wrap calls in try-catch, log errors to console, return empty arrays or null
  - Example: `getItems()` catches fetch errors and returns `[]` to avoid crashing grid

- **Permission Checks:** REST API endpoints validate via `check_permissions()` and per-item `current_user_can()`
  - Return 403 implicitly; per-item failures return `{ status: 'error', message: '...' }` in results

- **UI Feedback:** Status messages displayed in Inspector (green "Saved!" or red "Save failed.")
  - Grid shows empty state message when no items and not loading

- **Drag-Drop Guards:** `handleDragEnd()` validates that active.id !== over.id before calling API

- **Validation:** API parameters validated via `validate_callback` in route registration
  - Example: `item_ids` must be array or numeric; `folder_id` must be numeric

## Cross-Cutting Concerns

**Logging:**
- Frontend: Browser console via `console.error()` and `console.warn()`
- Backend: WordPress error logs via `error_log()` (if added; currently minimal logging)

**Validation:**
- Frontend: Input validation in Inspector (trim, filter empty names)
- Backend: Route parameter validation via `validate_callback`; per-item capability checks

**Authentication:**
- Enforced at REST API level via `permission_callback` checking `upload_files` or `edit_products` capability
- Per-item checks via `current_user_can('edit_post', $item_id)`

**Permissions:**
- Admin page: `upload_files` capability required
- Move items: `upload_files` or `edit_products` for endpoint access; per-item `edit_post` check
- Create/edit folders: Implicitly checked by WordPress REST for taxonomy terms
- Inspect folder: Can view if accessed via REST (no explicit check; follows WP defaults)

---

*Architecture analysis: 2026-03-19*
