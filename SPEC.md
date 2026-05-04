# Spec: Multi-Select & Batch Move for Media Items

## Objective

Allow users to select one or more media items in the Grid by clicking, then move the
entire selection into a folder by dragging any selected card onto a sidebar folder row.

**User story:** As a WordPress admin, I want to click images to select them, then drag
the selection into a folder so I can batch-organize large media libraries without
repeating the same drag-and-drop operation for each item individually.

**Current bug (blocking):** Dragging a media card toward the Sidebar fails — the card
visually disappears before it can reach a folder drop target. Root cause: the Grid
container has `overflowY: auto`, which creates a CSS clipping context. `MediaItem`
applies `transform: translate()` directly on itself, so the card is clipped at the
Grid's boundary as soon as it moves left. Fix: replace the inline transform with a
`DragOverlay` rendered at the `DndContext` root (above Sidebar and Grid, outside all
clipping contexts), and set `opacity: 0` on the source card while dragging.

**Success criteria:**
- Clicking a media card selects it (blue ring/tint); clicking it again deselects it.
- Clicking a second card adds it to the selection (does not replace it).
- Dragging any selected card moves **all** selected items into the target folder in one
  REST call.
- Dragging an unselected card moves just that one item (existing single-item behaviour
  is preserved for quick one-off moves).
- After a successful move the selection clears and the Grid refreshes.
- A drag-overlay badge reads "N items" (e.g. "3 items") while multi-dragging so the
  user knows how many cards will move.
- Selecting a different folder in the Sidebar clears the selection.

---

## Tech Stack

- **React** via `@wordpress/element` (WordPress-bundled React 18)
- **dnd-kit** `@dnd-kit/core ^6.1` — `useDraggable`, `useDroppable`, `DragOverlay`,
  `useDndMonitor`
- **@wordpress/scripts ^27** — build, test runner (Jest + `@testing-library/react`)
- No new npm dependencies required.

---

## Commands

```
Build:   npm run build
Dev:     npm run start
Test:    npm run test:unit
Package: npm run package
```

---

## Project Structure

```
src/
  index.js              ← App root — owns selectedItemIds state + handleDragEnd
  components/
    Grid.js             ← receives selectedItemIds + onToggleSelect, passes to MediaItem
    MediaItem.js        ← NEW: extracted from Grid.js; owns click-select + drag logic
    Sidebar.js          ← unchanged (folder drop targets already work)
    Inspector.js        ← unchanged
  api/
    client.js           ← unchanged
  style.scss            ← add .wpmf-item--selected styles
tests/
  (none yet for MediaItem — new test file to be created alongside the component)
```

---

## Code Style

Selection state is a plain `Set<number>` stored in `App` with `useState`:

```js
const [selectedItemIds, setSelectedItemIds] = useState(new Set());

const toggleSelectItem = useCallback((id) => {
    setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
}, []);

const clearSelection = useCallback(() => setSelectedItemIds(new Set()), []);
```

`MediaItem` is extracted to its own file. It receives props — no internal state for
selection. Click handler calls `onToggleSelect`; drag listeners use `useDraggable`.

The drag overlay lives in `App` (alongside `DndContext`) and renders only when
`activeDragId` is set:

```jsx
<DragOverlay>
    {activeDragId && selectedItemIds.has(activeDragId) && selectedItemIds.size > 1
        ? <div className="wpmf-drag-badge">{selectedItemIds.size} items</div>
        : null}
</DragOverlay>
```

Naming conventions:
- Props: camelCase (`isSelected`, `onToggleSelect`, `selectedItemIds`)
- CSS classes: BEM-style prefixed with `wpmf-` (`.wpmf-item--selected`)
- Handler functions: verb-noun (`toggleSelectItem`, `clearSelection`)

---

## Testing Strategy

Framework: Jest + `@testing-library/react` (via `@wordpress/scripts`).

Test files live next to their component: `src/components/MediaItem.test.js`.

Coverage targets for the new code:
- `MediaItem`: click toggles selection (select / deselect), drag does not re-select
- `Grid`: passes `selectedItemIds` and `onToggleSelect` down; renders selected state
- `App` (index.js): `handleDragEnd` — moves all selected IDs when active is in the
  selection; moves only active ID when active is NOT in the selection; clears selection
  after a successful move

No snapshot tests. Prefer `userEvent.click` over `fireEvent` where meaningful.

---

## Boundaries

**Always do:**
- Keep selection state in `App` (index.js) so `handleDragEnd` can read it without
  prop-drilling through Grid.
- Clear selection after every successful `moveItems` call.
- Clear selection when `selectedFolderId` changes (i.e. user switches folders).
- Run `npm run test:unit` before declaring any task done.

**Ask first:**
- Adding any new npm dependency.
- Changing the `moveItems` REST call signature or the PHP backend.
- Adding keyboard shortcuts (Cmd/Ctrl+click, Escape to deselect all) — good follow-up
  but out of scope for this spec.
- Adding a "Select All" / "Deselect All" toolbar button — same, out of scope.

**Never do:**
- Replace the existing single-item drag path (dragging an unselected card must still
  move just that one card).
- Store selected IDs inside `Grid` or `MediaItem` — always lift to `App`.
- Mutate the `selectedItemIds` Set directly; always derive a new Set via spread/copy.

---

## Implementation Plan

### Task 1 — Fix drag-over-sidebar: replace inline transform with `DragOverlay` (BLOCKING BUG)
- Add `DragOverlay` import to `index.js` from `@dnd-kit/core`
- Add `activeItem` state to `App`; set it via `onDragStart` on `DndContext`; clear it
  in `handleDragEnd`
- Expose item data via `useDraggable`'s `data` prop in `MediaItem`:
  `useDraggable({ id: item.id, data: { type: 'media', item } })`
- In `DragOverlay`, render a card clone using `activeItem` (thumbnail + title)
- In `MediaItem`: remove `transform`, `zIndex`, `position` from the drag style; set
  `opacity: 0` when `isDragging` (source card hides; overlay provides the visual)
- **Verify:** drag a card fully across the screen onto a sidebar folder — it should
  land and trigger a move; card must remain visible throughout the drag

### Task 2 — Extract `MediaItem` into its own file
- Move the `MediaItem` function from `Grid.js` into `src/components/MediaItem.js`
- `Grid.js` imports it; behaviour unchanged
- **Verify:** `npm run test:unit` still passes; build succeeds

### Task 3 — Add selection props to `MediaItem`
- Add `isSelected` (bool) and `onToggleSelect` (fn) props
- `onClick` on the card root calls `onToggleSelect(item.id)`; must not fire when a
  drag was initiated (guard with a `wasDragged` ref: set on drag start, clear after)
- Apply `.wpmf-item--selected` class (blue ring) when `isSelected === true`
- **Verify:** new `MediaItem.test.js` covers click-select / click-deselect

### Task 4 — Lift selection state into `App`
- Add `selectedItemIds` (Set) + `toggleSelectItem` + `clearSelection` to `App`
- Pass `selectedItemIds` and `onToggleSelect={toggleSelectItem}` to `Grid`
- Clear selection on `selectedFolderId` change (add effect in `App`)
- **Verify:** clicking items in the browser shows the blue ring

### Task 5 — Wire `Grid` to forward selection props to each `MediaItem`
- `Grid` receives `selectedItemIds` and `onToggleSelect` as new props
- Each `<MediaItem>` render gets `isSelected={selectedItemIds.has(item.id)}`
  and `onToggleSelect={onToggleSelect}`
- **Verify:** multi-select works in browser; deselect by re-clicking works

### Task 6 — Batch move in `handleDragEnd` + overlay badge
- In `handleDragEnd`: if `active.id` is in `selectedItemIds`, call
  `moveItems([...selectedItemIds], over.id)`. Otherwise call `moveItems([active.id], over.id)`.
- After success call `clearSelection()` then `refreshGrid()`
- Update `DragOverlay` to show "N items" badge when `selectedItemIds.size > 1` and
  the active item is selected
- **Verify:** dragging 3 selected items moves all 3; overlay badge shows "3 items"

### Task 7 — Style `.wpmf-item--selected` in `style.scss`
- Blue outline: `outline: 2px solid #007cba; outline-offset: 2px;`
- Light blue tint on thumbnail: `background: rgba(0,124,186,0.08)`
- **Verify:** visual check in browser

---

## Open Questions

1. Should clicking *outside* any card (on the grid background) deselect all? — Assumed
   **no** for now (low priority; ask if needed).
2. Should the drag overlay show a thumbnail of the first selected item? — Assumed
   **no** (text badge is sufficient for v1).
3. WooCommerce products: the `getItems` call already supports both media and products
   via the same endpoint. Are products also in scope for this select/move feature?
   — Assumed **yes** (same Grid, same behaviour).
