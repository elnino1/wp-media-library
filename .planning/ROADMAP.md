# Roadmap: WP Media Library Folders

## Overview

This is a brownfield project. Phases 01 and 02 are already complete. Phases 03-04 deliver the remaining v1 requirements: folder navigation that actually filters media, and a complete drag-move + auto-tag workflow that makes the core value real — media items tagged the moment they are organized.

## Phases

**Completed:**
- [x] **Phase 01: Inspector Foundation** - 3-column layout with Inspector panel wired into the SPA
- [x] **Phase 02: Tag Auto-Creation** - New tag names auto-created on Inspector save (MAP-03)

**Remaining:**
- [ ] **Phase 03: Folder Navigation & Media Filtering** - Sidebar tree works, sub-folders can be created, Inbox shows unassigned media
- [ ] **Phase 04: Move & Auto-Tag Completion** - Drag-to-folder moves items, tags replace on move, Inspector loads existing mappings, upload opens media uploader

## Phase Details

### Phase 01: Inspector Foundation
**Goal**: Users can see and interact with a 3-column SPA layout including an Inspector panel
**Status**: Complete
**Requirements**: (pre-roadmap)
**Success Criteria** (what must be TRUE):
  1. Inspector panel renders as the right column in the SPA
  2. Selecting a folder activates the Inspector for that folder
**Plans**: Complete

### Phase 02: Tag Auto-Creation
**Goal**: Users can type new tag names in Inspector and they are created automatically on save
**Status**: Complete
**Requirements**: MAP-03
**Success Criteria** (what must be TRUE):
  1. Typing an unknown tag name and saving creates that tag in WordPress
  2. Save does not fail if some tags already exist
**Plans**: Complete

### Phase 03: Folder Navigation & Media Filtering
**Goal**: Users can navigate the folder hierarchy and see only the media that belongs to the selected folder (or no folder)
**Depends on**: Phase 02
**Requirements**: FOLD-01, FOLD-02, MEDIA-01
**Success Criteria** (what must be TRUE):
  1. User can create a sub-folder under any selected folder and it appears nested in the sidebar tree
  2. Selecting a folder in the sidebar shows only media assigned to that folder in the grid
  3. Selecting the Inbox (root) shows only media with no folder assigned
**Plans:** 1/2 plans executed

Plans:
- [ ] 03-01-PLAN.md — Backend folder filter + frontend API wiring for folder-based media display
- [ ] 03-02-PLAN.md — Sidebar collapse/expand tree, defensive buildTree, sub-folder creation polish

### Phase 04: Move & Auto-Tag Completion
**Goal**: Users can drag media into a folder and the folder's mapped tags are automatically applied — the core value delivered end-to-end
**Depends on**: Phase 03
**Requirements**: MOVE-01, MOVE-02, MAP-01, MAP-02, MEDIA-02
**Success Criteria** (what must be TRUE):
  1. Dragging a media item onto a folder moves it: it disappears from the current view and appears in the target folder
  2. After a move, the item's WP tags match exactly the tags the folder is mapped to (replacing any previous tags)
  3. Opening the Inspector for a folder shows the tag mappings previously saved for that folder
  4. Clicking the upload button opens the WordPress media uploader
**Plans**: TBD

## Progress

**Execution Order:** 03 → 04

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 01. Inspector Foundation | - | Complete | 2026-03-19 |
| 02. Tag Auto-Creation | - | Complete | 2026-03-19 |
| 03. Folder Navigation & Media Filtering | 1/2 | In Progress|  |
| 04. Move & Auto-Tag Completion | 0/TBD | Not started | - |
