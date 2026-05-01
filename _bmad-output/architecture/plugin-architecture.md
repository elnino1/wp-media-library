# WP Media Library Folders Plugin - System Architecture
*Architect: Winston*
*Status: Initial Draft (Based on Brainstorming Session)*

## 1. Executive Summary
This document outlines the architecture for a WordPress plugin that introduces a desktop-class "Virtual Folder" management system for both standard media attachments and WooCommerce products. By leveraging native WordPress taxonomies as virtual folders rather than physically moving files, we avoid breaking URLs for third-party integrations (e.g., Printful, Gelato). The system is built with a dual-interface approach: a highly visual, bulk-operation frontend for humans, and tiny, atomic REST/CLI endpoints for AI agents.

---

## 2. Core Architecture & Data Model

### Non-Destructive Virtual Folders
The entire folder structure relies on WordPress Taxonomies rather than server-level directories.
- **Taxonomy Registration:** Register a custom hierarchical taxonomy called `wp_virtual_folder`.
- **Object Types:** Bind `wp_virtual_folder` to both the `attachment` and `product` post types.
- **The "Inbox" (Root):** The root folder does not exist in the database. It is a computed view showing any `attachment` or `product` where the `wp_virtual_folder` term is `NULL` (or empty).

### Smart Taxonomy / Tag Mapping
Folders can act as intelligent triggers to apply standard WP tags or categories.
- **Folder Meta Data:** Utilize `add_term_meta()` on the `wp_virtual_folder` taxonomy to store an array of associated WP tags or Woo categories.
- **Hook Architecture:** Hook into `set_object_terms` or the custom move endpoint. When an item is assigned to a virtual folder, the backend cross-references the folder's meta and automatically applies the mapped tags/categories to the item.

---

## 3. Backend & API Layer (The Agent Paradigm)

The backend exposes simple, atomic operations to maximize agent-compatibility and reduce context overhead during AI operations.

### Custom REST API (`/wp-json/media-folders/v1/`)
- `GET /folders` - Returns the hierarchical tree of virtual folders.
- `POST /folders` - Creates a new folder. Payload: `{ name: string, parent: int, mapped_tags: array }`
- `POST /move` - Moves an item to a folder. Payload: `{ item_id: int, item_type: string, folder_id: int }`
- `POST /bulk-move` - Handles human UI operations. Payload: `{ item_ids: array, item_type: string, folder_id: int }`

### WP-CLI Integration
For headless server management and scripting:
- `wp virtual-folder create <name> [--parent=<id>]`
- `wp virtual-folder move <item_id> <folder_id> [--type=<attachment|product>]`

---

## 4. Frontend Layer (Desktop-Class UI)

The frontend replaces the standard WP list/grid view with a unified, app-like experience embedded in `wp-admin`.

### Tech Stack
- **Framework:** React.js (via `@wordpress/element`) to deeply integrate with standard WordPress admin build tools.
- **Drag-and-Drop:** `dnd-kit` (lightweight, modular) for dragging items between the grid and the folder tree.
- **Selection:** A custom marquee/lasso select library to enable OS-like dragging boxes over multiple items without Shift+Clicking if desired.

### Component Structure
- **Sidebar (Tree View):** Renders the hierarchical `wp_virtual_folder` taxonomy. Includes a persistent "Inbox" node at the top.
- **Main Area (Grid/List View):** Fetches and renders items inside the currently active folder via the REST API. Infinite scrolling implemented over standard pagination.
- **Inspector (Right Panel):** When a folder or item is selected, this panel shows metadata, mapped tags, and configuration options.

---

## 5. Implementation Roadmap & Milestones

**Phase 1: Foundation & Data Layer (Quick Wins)**
- Register `wp_virtual_folder` taxonomy.
- Build the atomic REST API routes and WP-CLI commands.
- Implement the "Inbox" query logic.

**Phase 2: Tag Mapping & Automation**
- Add term meta fields for folders to store mapped WooCommerce categories/tags.
- Build the auto-tagging hooks when items are assigned to a virtual folder.

**Phase 3: Desktop-Class UI**
- Scaffold the React SPA inside the WP Admin.
- Build the dual-pane layout and fetch data via the custom REST endpoints.
- Implement `dnd-kit` for moving items into folders.
- Implement bulk-selection (marquee/shift-click) mechanics.

---
*End of Document*
