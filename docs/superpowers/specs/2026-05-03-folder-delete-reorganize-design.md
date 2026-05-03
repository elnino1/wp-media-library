# Folder Delete & Reorganization — Design Spec

**Date:** 2026-05-03  
**Status:** Approved

---

## Overview

Two new features for the WP Media Library sidebar:

1. **Delete a folder** — images and immediate sub-folders are promoted to the parent before the folder is removed.
2. **Reorganize folders** — a drag handle on the selected folder row allows dragging to a new position in the tree (reorder siblings or nest under another folder).

---

## UI

- When a folder is **selected**, two controls appear on its row:
  - **⠿ drag handle** (left of folder name) — grab to reposition
  - **🗑 delete button** (right of folder name)
- No hover-reveal: controls appear only on the active (selected) folder to keep the sidebar uncluttered.

---

## Feature 1 — Delete Folder

### Interaction flow

1. User clicks 🗑 on the selected folder.
2. An inline confirmation banner appears just below the folder row (no `window.confirm`):
   > Supprimer « Nom » ? Les images et sous-dossiers remontent au parent.  
   > **[Confirmer]** **[Annuler]**
3. User clicks **Confirmer** → API call `DELETE /wpmf/v1/folder/{id}`.
4. On success:
   - If the deleted folder was selected → auto-select its parent (or root if parent = 0).
   - Reload the folder list.
   - Refresh the media grid (items have moved).

### Backend — `DELETE /wpmf/v1/folder/{id}`

1. Verify `current_user_can('upload_files')`.
2. Fetch the term to get its `parent` id.
3. Move all media in this folder to the parent:
   ```php
   foreach ( get_objects_in_term( $id, 'wpmf_folders' ) as $media_id ) {
       wp_set_object_terms( $media_id, $parent_id ? [$parent_id] : [], 'wpmf_folders' );
   }
   ```
4. Promote immediate child folders to the parent:
   ```php
   foreach ( get_term_children( $id, 'wpmf_folders' ) as $child_id ) {
       // only direct children (depth = 1)
       $child = get_term( $child_id, 'wpmf_folders' );
       if ( (int) $child->parent === $id ) {
           wp_update_term( $child_id, 'wpmf_folders', ['parent' => $parent_id] );
       }
   }
   ```
5. Delete the term: `wp_delete_term( $id, 'wpmf_folders' )`.
6. Return `{ success: true }`.

### Edge case — nested sub-folders

Only **immediate** children are re-parented. Their own children stay attached to them. Example:

```
Before:          After deleting B:
A                A
└── B            ├── C        ← promoted one level
    └── C        │   └── D    ← stays under C
        └── D    └── (media from B)
```

---

## Feature 2 — Folder Reorganization

### Drag behavior

A **separate `DndContext`** is added inside `Sidebar` (independent of the App-level DndContext used for media items). This prevents any interference with media drag-and-drop.

**Draggable:** each folder row exposes `useDraggable` scoped to its ⠿ handle only (clicking the folder name still selects it without triggering drag).

**Drop targets (two kinds):**

| Target id format | Meaning | Result |
|---|---|---|
| `folder:{id}` | The body of a folder row | Dragged folder becomes a child of this folder |
| `gap:{parentId}:{position}` | Thin zone between two rows | Dragged folder is reordered as a sibling at this position |

Gap zones are 4px tall at rest and expand to 16px during an active drag to make them easier to target.

**Collision detection:** `pointerWithin` (primary) → `closestCenter` (fallback).

**`onDragEnd` routing:**
```js
if (over.id.startsWith('gap:')) {
    const [, parentId, position] = over.id.split(':');
    await moveFolder(active.id, Number(parentId), Number(position));
} else {
    // over.id is a folder id — nest inside it
    await moveFolder(active.id, Number(over.id), 0);
}
```

**Guard:** if `over.id` is the dragged folder itself or one of its descendants → no-op.

**After a move:** reload folder list, rebuild tree client-side. No media grid refresh needed (media assignments are unchanged).

### Backend — `POST /wpmf/v1/folder/{id}/move`

Parameters:
- `parent_id` (int, 0 = root) — new parent for the dragged folder
- `sibling_ids` (int[], ordered) — **full ordered list of sibling IDs** at the new parent level after the move (including the moved folder at its new position)

Steps:
1. Verify `current_user_can('upload_files')`.
2. Update parent: `wp_update_term( $id, 'wpmf_folders', ['parent' => $parent_id] )`.
3. Reassign order to all siblings: iterate `sibling_ids` and call `update_term_meta( $sibling_id, 'wpmf_folder_order', $index * 10 )` (multiples of 10 to leave room for future insertions).
4. Return the updated term.

The client computes `sibling_ids` by taking the current sorted sibling list, removing the dragged folder from its old position, inserting it at the drop position, and sending the result.

### Order storage

- Each folder term has a `wpmf_folder_order` term meta (integer, default 0).
- Values are stored as multiples of 10 (0, 10, 20…) so ties never occur after a move.
- Registered with `show_in_rest: true` so the existing `/wp/v2/wpmf_folders` response includes it.
- Registration goes in `class-wpmf-taxonomy.php`.
- The client sorts folders by `wpmf_folder_order` (ascending) when building the tree, before grouping by parent.

---

## Files Changed

| File | Change |
|---|---|
| `includes/class-wpmf-api.php` | Add `DELETE /wpmf/v1/folder/{id}` and `POST /wpmf/v1/folder/{id}/move` routes |
| `includes/class-wpmf-taxonomy.php` | Register `wpmf_folder_order` term meta with `show_in_rest: true` |
| `src/api/client.js` | Add `deleteFolder(id)` and `moveFolder(id, parentId, order)` |
| `src/components/Sidebar.js` | Add inner DndContext, drag handle, delete button + confirmation banner, gap drop zones |

No new files required.

---

## Out of Scope

- Renaming folders (separate feature)
- Multi-level recursive delete (only immediate children are re-parented)
- Undo/redo
