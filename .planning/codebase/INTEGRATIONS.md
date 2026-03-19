# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**WordPress REST API:**
- WordPress built-in REST API - Used for all communication between React frontend and PHP backend
  - SDK/Client: `@wordpress/api-fetch`
  - Endpoints used:
    - `/wp/v2/media?wpmf_folder=inbox` - Retrieve unassigned media items (GET)
    - `/wp/v2/media?wpmf_folder={id}` - Retrieve media assigned to a specific folder (GET)
    - `/wp/v2/wpmf_folders` - Retrieve virtual folders taxonomy terms (GET)
    - `/wpmf/v1/move` - Custom endpoint to move items between folders (POST)

**Third-Party Integrations (Documented Intent):**
- WooCommerce Products - Planned support for drag-and-drop organization of products alongside media
  - Current: Custom taxonomy registered to both `attachment` and `product` post types
  - Dropshipping Services (Printful, Gelato) - Documented use case for auto-imported product organization

## Data Storage

**Databases:**
- WordPress MySQL/MariaDB (native)
  - Connection: Via WordPress global `wpdb` object
  - Access: WordPress native taxonomy API (`wp_set_object_terms`, `get_taxonomy`)
  - Storage: WordPress `wp_termmeta` and `wp_term_relationships` tables (taxonomy implementation)

**Data Model:**
- Custom Taxonomy: `wp_virtual_folder` - Hierarchical taxonomy
  - Registered to: `attachment` (media library items) and `product` (WooCommerce - future)
  - Hierarchy: Parent-child relationships enabled
  - Visibility: Not shown in WordPress admin UI (managed entirely by React app)
  - REST API: Exposed at `/wp/v2/wpmf_folders`

**File Storage:**
- Local filesystem - WordPress native media uploads
  - No external cloud storage integration
  - Files remain in standard WordPress `/wp-content/uploads/` directory

**Caching:**
- None detected
- React component state used for UI caching only
- No HTTP caching headers set by custom endpoints

## Authentication & Identity

**Auth Provider:**
- Custom WordPress capability checks
  - `upload_files` - Required for media management operations
  - `edit_products` - Required for product management operations
  - `edit_post` - Granular per-item permission check in `/wpmf/v1/move` endpoint

**Implementation:**
- Location: `includes/class-wpmf-api.php`
- Method: `WPMF_API::check_permissions()` validates user capabilities
- Per-item validation: `current_user_can('edit_post', $item_id)` for each item in batch moves

## Monitoring & Observability

**Error Tracking:**
- Not integrated
- Client-side: `console.error()` for debugging (in `src/api/client.js`, `src/index.js`)
- Server-side: WordPress error logging (if enabled in wp-config.php)

**Logs:**
- Browser console only (development)
- WordPress debug.log (if `WP_DEBUG` enabled)
- No centralized error tracking or monitoring service

## CI/CD & Deployment

**Hosting:**
- Self-hosted WordPress installation required
- No cloud platform dependencies
- Plugin distributed as ZIP file for manual upload

**CI Pipeline:**
- Not detected in repository
- No GitHub Actions or external CI configuration found
- Manual testing required before packaging

**Deployment Process:**
- Local build via `npm run build` on developer machine
- Package via `npm run package` creates distribution ZIP
- Manual upload to WordPress admin interface

## Environment Configuration

**Required Environment Variables:**
- None required at runtime
- WordPress database credentials (standard WordPress setup)

**Optional:**
- `WP_DEBUG` - WordPress native debug flag (affects logging)
- No custom environment variables defined by plugin

**Secrets Location:**
- Not applicable - No external API keys or secrets
- WordPress database credentials stored in wp-config.php (standard WordPress)

## Local Development Environment

**Setup Tool:**
- `@wordpress/env` - Docker-based local WordPress environment
- Configuration: `.wp-env.json`
- Commands:
  ```bash
  npm run env:start     # Start local WordPress via Docker
  npm run env:stop      # Stop environment
  npm run env:destroy   # Clean up Docker containers/volumes
  ```
- Runs latest WordPress with plugin loaded as `/wp-content/plugins/wp-media-library/`

## Webhooks & Callbacks

**Incoming:**
- REST API POST endpoint: `/wpmf/v1/move`
  - Accepts: `item_ids` (array), `folder_id` (integer)
  - Returns: JSON response with per-item success/error status
  - Designed for AI agent integration per README

**Outgoing:**
- None

## WordPress Hooks & Actions

**Actions Registered:**
- `plugins_loaded` - Plugin initialization trigger
- `rest_api_init` - REST route registration (taxonomy and custom endpoints)
- `init` - Taxonomy registration

**Filters Used:**
- `rest_attachment_query` - Intercepts /wp/v2/media REST query args to inject tax_query for folder-based filtering (WPMF_Taxonomy::filter_media_by_folder)

**Custom Endpoints:**
- Location: `includes/class-wpmf-api.php`
- Route: `/wpmf/v1/move`
- Method: POST
- Permissions: `upload_files` OR `edit_products`

## Post Types & Taxonomies

**Post Types Used:**
- `attachment` - WordPress media library items
- `product` - WooCommerce products (planned support)

**Custom Taxonomy:**
- Name: `wp_virtual_folder`
- Type: Hierarchical (parent-child relationships)
- Attached to: `attachment`, `product`
- Visibility: Internal only (no public URL rewrites)
- REST Base: `wpmf_folders`
- Management: Entirely through React UI or `/wpmf/v1/move` endpoint

---

*Integration audit: 2026-03-19*
