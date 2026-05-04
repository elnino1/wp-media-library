# WP Media Library

A desktop-class, visual drag-and-drop workspace for WordPress Media and WooCommerce Products.

## Core Concept
Unlike traditional folder plugins that physically move files and risk breaking URLs for dropshipping integrations (like Printful or Gelato), **WP Media Library utilizes Non-Destructive Virtual Folders.** The visual folders you see in the sidebar map directly to native WordPress custom taxonomies (`wp_virtual_folder`).

This architecture allows you to freely move, sort, and organize massive volumes of auto-imported products or media assets natively using a desktop-class "Finder/Explorer" dual-pane UI—without risking broken file links.

## Key Features
- **The "Inbox" Triage Queue:** The root level automatically identifies any media or product that hasn't been categorized yet, turning the default WP media library into an efficient triage workflow.
- **Universal Drag-and-Map:** Drag both Media Attachments and WooCommerce Products into the same visual folders.
- **Folder Delete with Promotion:** Delete any folder from the sidebar with an inline confirmation. Media and immediate sub-folders are automatically promoted to the parent folder rather than lost.
- **Folder Drag-to-Reorder and Nest:** Grab the ⠿ handle on a selected folder to drag it to a new position. Drop it onto another folder to nest it as a child, or drop it between folders to reorder as a sibling.
- **Smart Tag Mapping:** Bind virtual folders to standard WP Tags or WooCommerce Categories so that moving an item applies native site metadata instantly.
- **Agent-Ready API:** The underlying PHP architecture uses atomic REST endpoints (`/wp-json/wpmf/v1/move`, `/wp-json/wpmf/v1/folder/{id}`, `/wp-json/wpmf/v1/folder/{id}/move`) designed for AI agents to categorize and reorganize media via script loops efficiently.
- **Desktop-Class Speed:** Modern React SPA utilizing `@dnd-kit` inside the `wp-admin` dashboard for rapid batch operations without page reloads.

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/wp-json/wpmf/v1/move` | Move media items into a folder |
| `DELETE` | `/wp-json/wpmf/v1/folder/{id}` | Delete a folder; media and sub-folders promoted to parent |
| `POST` | `/wp-json/wpmf/v1/folder/{id}/move` | Move a folder to a new parent and reorder siblings |

All folder routes require `manage_categories` capability. The media move route requires `upload_files`.

## Installation & Packaging

This plugin utilizes a React frontend and must be built before distribution.

If you are developing or cloning the source:
1. Ensure Node.js is installed (`node -v`)
2. Run `npm install`
3. Package the plugin by running: `npm run package`

The packaging script will compile the minified React assets via `@wordpress/scripts` and create `wp-media-library.zip` containing only the production-ready PHP and JavaScript files.

Upload `wp-media-library.zip` inside your WordPress **Plugins → Add New** menu.

## Usage
1. Activate the plugin in WordPress.
2. Click the new **Media Library** menu item in your WordPress Admin Sidebar.
3. You will see an Inbox mapping to unassigned media/products. Use the `+ New Folder` button to construct your hierarchy.
4. Drag and drop your unassigned imported products (e.g. from Printful/Gelato) directly into your new virtual folders.
5. Select a folder to reveal the ⠿ drag handle (reorder/nest) and 🗑 delete button on that row.
