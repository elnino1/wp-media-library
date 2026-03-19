# Requirements: WP Media Library Folders

**Defined:** 2026-03-19
**Core Value:** Media items are automatically tagged the moment they're organized — zero extra steps for the user.

## v1 Requirements

### Folders

- [x] **FOLD-01**: User can create a sub-folder under the currently selected folder
- [x] **FOLD-02**: User sees folders in a hierarchical sidebar tree (breadcrumb-navigable)

### Moving Items

- [ ] **MOVE-01**: User can drag a media item and drop it onto a folder to move it
- [ ] **MOVE-02**: When an item is moved to a folder, the folder's mapped WP tags replace the item's existing tags

### Media Display

- [ ] **MEDIA-01**: Inbox (root) shows only media with no folder assigned
- [ ] **MEDIA-02**: Upload button opens the WP media uploader

### Tag Mapping

- [ ] **MAP-01**: User can set which WP tags a folder maps to via the Inspector panel
- [ ] **MAP-02**: Inspector shows the folder's existing tag mappings when a folder is selected
- ✓ **MAP-03**: New tag names are created automatically when typed — *complete (phase 02)*

## v2 Requirements

### WooCommerce

- **WOO-01**: User can organize WooCommerce products into virtual folders
- **WOO-02**: Moving a product to a folder applies the folder's mapped WooCommerce categories

### Bulk Operations

- **BULK-01**: User can select multiple media items and move them to a folder at once

### CLI

- **CLI-01**: Admin can create/move folders via WP-CLI commands

## Out of Scope

| Feature | Reason |
|---------|--------|
| Physical file reorganization | Non-destructive by design — moving files breaks URLs used by 3rd-party integrations |
| PHP 7.x / WP 5.x support | Modern stack only (WP 6.x+, PHP 8.x+) |
| WooCommerce products (v1) | Validate core media UX first; WooCommerce adds complexity |
| Bulk multi-select (v1) | Deferred to v2 |
| Real-time sync across tabs | Overkill for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOLD-01 | Phase 03 | Complete |
| FOLD-02 | Phase 03 | Complete |
| MEDIA-01 | Phase 03 | Pending |
| MAP-01 | Phase 04 | Pending |
| MAP-02 | Phase 04 | Pending |
| MOVE-01 | Phase 04 | Pending |
| MOVE-02 | Phase 04 | Pending |
| MEDIA-02 | Phase 04 | Pending |
| MAP-03 | Phase 02 | Complete |

**Coverage:**
- v1 requirements: 9 total (8 pending + 1 complete)
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 — traceability updated after roadmap creation (phases 03-04)*
