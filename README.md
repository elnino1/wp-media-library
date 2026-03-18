# WP Media Library Folders

A desktop-class, visual drag-and-drop workspace for WordPress Media and WooCommerce Products.

## Core Concept
Unlike traditional folder plugins that physically move files and risk breaking URLs for dropshipping integrations (like Printful or Gelato), **WP Media Library Folders utilizes Non-Destructive Virtual Folders.** The visual folders you see in the sidebar map directly to native WordPress custom taxonomies (`wp_virtual_folder`). 

This architecture allows you to freely move, sort, and organize massive volumes of auto-imported products or media assets natively using a desktop-class "Finder/Explorer" dual-pane UI—without risking broken file links.

## Key Features
- **The "Inbox" Triage Queue:** The root level automatically identifies any media or product that hasn't been categorized yet, turning the default WP media library into an efficient triage workflow.
- **Universal Drag-and-Map:** Drag both Media Attachments and WooCommerce Products into the same visual folders.
- **Smart Tag Mapping (Upcoming):** Bind virtual folders to standard WP Tags or Woo Categories so that moving an item applies native site metadata instantly.
- **Agent-Ready API:** The underlying PHP architecture uses tiny atomic endpoints (`/wp-json/wpmf/v1/move`) specifically designed for AI agents to categorize images via script loops efficiently.
- **Desktop-Class Speed:** Modern React SPA utilizing `@dnd-kit` inside the `wp-admin` dashboard for rapid batch operations without page reloads.

## Installation & Packaging

This plugin utilizes a React frontend and must be built before distribution. 

If you are developing or cloning the source:
1. Ensure Node.js is installed (`node -v`)
2. Run `npm install`
3. Package the plugin by running: `npm run package`

The packaging script will compile the minified React assets via `@wordpress/scripts` and package `wp-media-folders.zip` containing ONLY the production-ready PHP and Javascript files. 

Upload `wp-media-folders.zip` inside your WordPress **Plugins -> Add New** menu.

## Usage
1. Activate the plugin in WordPress.
2. Click the new **Media Folders** menu item in your WordPress Admin Sidebar.
3. You will see an Inbox mapping to unassigned media/products. Use the `+ New Folder` button to construct your hierarchy.
4. Drag and drop your unassigned imported products (e.g. from Printful/Gelato) directly into your new virtual folders.
