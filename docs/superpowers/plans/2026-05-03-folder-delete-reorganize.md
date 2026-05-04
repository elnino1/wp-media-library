# Folder Delete & Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add folder deletion (with media/sub-folder promotion to parent) and folder drag-to-reorder/nest in the sidebar.

**Architecture:** Seven sequential tasks: register order meta → DELETE endpoint → move endpoint → JS client functions → App.js guard → Sidebar delete UI → Sidebar drag. Each task is independently committable. The spec calls for a nested DndContext inside Sidebar; this plan uses `useDndMonitor` from `@dnd-kit/core` on the outer App DndContext instead — this avoids breaking the existing media-to-folder drop targets, since dnd-kit hooks bind to the nearest DndContext ancestor and nesting would reroute `useDroppable` calls away from the outer context.

**Tech Stack:** PHP 8 / WordPress REST API, React (`@wordpress/element`), `@dnd-kit/core` (already installed), `@testing-library/react`, WP_UnitTestCase.

---

## File Map

| File | Change |
|---|---|
| `includes/class-wpmf-taxonomy.php` | Add `register_folder_order_meta()` |
| `includes/class-wpmf-api.php` | Add DELETE `/wpmf/v1/folder/{id}` and POST `/wpmf/v1/folder/{id}/move` |
| `tests/WpmfApiTest.php` | Add PHP tests for new endpoints |
| `src/api/client.js` | Add `deleteFolder` and `moveFolder` exports |
| `src/api/client.test.js` | Add JS tests for new functions |
| `src/index.js` | Update `handleDragEnd` to skip folder drags |
| `src/components/Sidebar.js` | Add delete UI, drag handle, gap zones, `useDndMonitor` |
| `src/components/Sidebar.test.js` | Add tests for delete and move UI |

---

## Task 1: Register wpmf_folder_order term meta

**Files:**
- Modify: `includes/class-wpmf-taxonomy.php`
- Test: `tests/WpmfApiTest.php`

- [ ] **Step 1: Write the failing PHP test**

Add to `tests/WpmfApiTest.php` inside the `WpmfApiTest` class:

```php
public function test_folder_order_meta_is_registered() {
    $registered = get_registered_meta_keys( 'term', 'wp_virtual_folder' );
    $this->assertArrayHasKey( 'wpmf_folder_order', $registered );
}

public function test_folder_order_meta_is_integer_type() {
    $registered = get_registered_meta_keys( 'term', 'wp_virtual_folder' );
    $this->assertEquals( 'integer', $registered['wpmf_folder_order']['type'] );
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:php 2>&1 | grep -E "(FAIL|PASS|Error|wpmf_folder_order)"
```

Expected: `FAIL` — `wpmf_folder_order` not yet registered.

- [ ] **Step 3: Add `register_folder_order_meta` to the taxonomy class**

In `includes/class-wpmf-taxonomy.php`, update `init()` and add the new method:

```php
public static function init() {
    add_action( 'init', array( __CLASS__, 'register_virtual_folder_taxonomy' ) );
    add_action( 'init', array( __CLASS__, 'register_folder_order_meta' ) );
    add_action( 'rest_api_init', array( __CLASS__, 'register_rest_fields' ) );
}

public static function register_folder_order_meta() {
    register_term_meta( 'wp_virtual_folder', 'wpmf_folder_order', array(
        'type'         => 'integer',
        'single'       => true,
        'default'      => 0,
        'show_in_rest' => true,
    ) );
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:php 2>&1 | grep -E "(FAIL|PASS|OK)"
```

Expected: all existing tests plus the two new ones pass.

- [ ] **Step 5: Commit**

```bash
git add includes/class-wpmf-taxonomy.php tests/WpmfApiTest.php
git commit -m "feat: register wpmf_folder_order term meta exposed in REST"
```

---

## Task 2: DELETE /wpmf/v1/folder/{id} endpoint

**Files:**
- Modify: `includes/class-wpmf-api.php`
- Test: `tests/WpmfApiTest.php`

- [ ] **Step 1: Write the failing PHP test**

Add to `tests/WpmfApiTest.php`:

```php
public function test_delete_folder_moves_media_to_parent() {
    wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

    $parent     = wp_insert_term( 'ParentFolder', 'wp_virtual_folder' );
    $child      = wp_insert_term( 'ChildFolder', 'wp_virtual_folder', array( 'parent' => $parent['term_id'] ) );
    $attach_id  = self::factory()->attachment->create();
    wp_set_object_terms( $attach_id, array( $child['term_id'] ), 'wp_virtual_folder' );

    $request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/' . $child['term_id'] );
    $request->set_url_params( array( 'id' => $child['term_id'] ) );
    $response = rest_get_server()->dispatch( $request );

    $this->assertEquals( 200, $response->get_status() );
    $this->assertTrue( $response->get_data()['success'] );

    $terms = wp_get_object_terms( $attach_id, 'wp_virtual_folder', array( 'fields' => 'ids' ) );
    $this->assertContains( (int) $parent['term_id'], array_map( 'intval', $terms ) );
    $this->assertNotContains( (int) $child['term_id'], array_map( 'intval', $terms ) );
}

public function test_delete_folder_promotes_child_folders_to_parent() {
    wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

    $grandparent = wp_insert_term( 'GP', 'wp_virtual_folder' );
    $parent      = wp_insert_term( 'P',  'wp_virtual_folder', array( 'parent' => $grandparent['term_id'] ) );
    $child       = wp_insert_term( 'C',  'wp_virtual_folder', array( 'parent' => $parent['term_id'] ) );

    $request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/' . $parent['term_id'] );
    $request->set_url_params( array( 'id' => $parent['term_id'] ) );
    rest_get_server()->dispatch( $request );

    $updated_child = get_term( $child['term_id'], 'wp_virtual_folder' );
    $this->assertEquals( (int) $grandparent['term_id'], (int) $updated_child->parent );
}

public function test_delete_folder_moves_media_to_root_when_no_parent() {
    wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

    $folder    = wp_insert_term( 'TopLevel', 'wp_virtual_folder' );
    $attach_id = self::factory()->attachment->create();
    wp_set_object_terms( $attach_id, array( $folder['term_id'] ), 'wp_virtual_folder' );

    $request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/' . $folder['term_id'] );
    $request->set_url_params( array( 'id' => $folder['term_id'] ) );
    rest_get_server()->dispatch( $request );

    $terms = wp_get_object_terms( $attach_id, 'wp_virtual_folder', array( 'fields' => 'ids' ) );
    $this->assertEmpty( $terms );
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:php 2>&1 | grep -E "(FAIL|PASS|test_delete)"
```

Expected: `FAIL` — route not yet registered.

- [ ] **Step 3: Register the DELETE route and implement the callback**

In `includes/class-wpmf-api.php`, add to `register_routes()`:

```php
register_rest_route( 'wpmf/v1', '/folder/(?P<id>\d+)', array(
    'methods'             => 'DELETE',
    'callback'            => array( __CLASS__, 'delete_folder' ),
    'permission_callback' => array( __CLASS__, 'check_permissions' ),
    'args'                => array(
        'id' => array(
            'required'          => true,
            'validate_callback' => 'is_numeric',
        ),
    ),
) );
```

Add the callback method to the class:

```php
public static function delete_folder( WP_REST_Request $request ) {
    $id   = (int) $request->get_param( 'id' );
    $term = get_term( $id, 'wp_virtual_folder' );

    if ( is_wp_error( $term ) || ! $term ) {
        return new WP_Error( 'not_found', 'Folder not found', array( 'status' => 404 ) );
    }

    $parent_id = (int) $term->parent;

    // Move all media in this folder to the parent (or root)
    $media_ids = get_objects_in_term( $id, 'wp_virtual_folder' );
    if ( ! is_wp_error( $media_ids ) ) {
        foreach ( $media_ids as $media_id ) {
            if ( $parent_id > 0 ) {
                wp_set_object_terms( (int) $media_id, array( $parent_id ), 'wp_virtual_folder' );
            } else {
                wp_set_object_terms( (int) $media_id, array(), 'wp_virtual_folder' );
            }
        }
    }

    // Promote immediate child folders one level up
    $all_children = get_term_children( $id, 'wp_virtual_folder' );
    if ( ! is_wp_error( $all_children ) ) {
        foreach ( $all_children as $child_id ) {
            $child = get_term( (int) $child_id, 'wp_virtual_folder' );
            if ( $child && ! is_wp_error( $child ) && (int) $child->parent === $id ) {
                wp_update_term( (int) $child_id, 'wp_virtual_folder', array( 'parent' => $parent_id ) );
            }
        }
    }

    wp_delete_term( $id, 'wp_virtual_folder' );

    return rest_ensure_response( array( 'success' => true, 'parent_id' => $parent_id ) );
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:php 2>&1 | grep -E "(FAIL|PASS|OK)"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add includes/class-wpmf-api.php tests/WpmfApiTest.php
git commit -m "feat: add DELETE /wpmf/v1/folder/{id} endpoint with media and subfolder promotion"
```

---

## Task 3: POST /wpmf/v1/folder/{id}/move endpoint

**Files:**
- Modify: `includes/class-wpmf-api.php`
- Test: `tests/WpmfApiTest.php`

- [ ] **Step 1: Write the failing PHP test**

Add to `tests/WpmfApiTest.php`:

```php
public function test_move_folder_updates_parent() {
    wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

    $new_parent = wp_insert_term( 'NewParent', 'wp_virtual_folder' );
    $folder     = wp_insert_term( 'MovedFolder', 'wp_virtual_folder' );

    $request = new WP_REST_Request( 'POST', '/wpmf/v1/folder/' . $folder['term_id'] . '/move' );
    $request->set_url_params( array( 'id' => $folder['term_id'] ) );
    $request->set_param( 'parent_id', $new_parent['term_id'] );
    $request->set_param( 'sibling_ids', array( $folder['term_id'] ) );
    $response = rest_get_server()->dispatch( $request );

    $this->assertEquals( 200, $response->get_status() );

    $updated = get_term( $folder['term_id'], 'wp_virtual_folder' );
    $this->assertEquals( (int) $new_parent['term_id'], (int) $updated->parent );
}

public function test_move_folder_assigns_sibling_order() {
    wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

    $a = wp_insert_term( 'A', 'wp_virtual_folder' );
    $b = wp_insert_term( 'B', 'wp_virtual_folder' );
    $c = wp_insert_term( 'C', 'wp_virtual_folder' );

    // Move C to position 0 among root siblings [C, A, B]
    $request = new WP_REST_Request( 'POST', '/wpmf/v1/folder/' . $c['term_id'] . '/move' );
    $request->set_url_params( array( 'id' => $c['term_id'] ) );
    $request->set_param( 'parent_id', 0 );
    $request->set_param( 'sibling_ids', array( $c['term_id'], $a['term_id'], $b['term_id'] ) );
    rest_get_server()->dispatch( $request );

    $this->assertEquals( 0,  (int) get_term_meta( $c['term_id'], 'wpmf_folder_order', true ) );
    $this->assertEquals( 10, (int) get_term_meta( $a['term_id'], 'wpmf_folder_order', true ) );
    $this->assertEquals( 20, (int) get_term_meta( $b['term_id'], 'wpmf_folder_order', true ) );
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:php 2>&1 | grep -E "(FAIL|PASS|test_move)"
```

Expected: `FAIL` — route not yet registered.

- [ ] **Step 3: Register the move route and implement the callback**

In `includes/class-wpmf-api.php`, add to `register_routes()`:

```php
register_rest_route( 'wpmf/v1', '/folder/(?P<id>\d+)/move', array(
    'methods'             => 'POST',
    'callback'            => array( __CLASS__, 'move_folder' ),
    'permission_callback' => array( __CLASS__, 'check_permissions' ),
    'args'                => array(
        'id' => array(
            'required'          => true,
            'validate_callback' => 'is_numeric',
        ),
        'parent_id' => array(
            'required'          => true,
            'validate_callback' => 'is_numeric',
        ),
        'sibling_ids' => array(
            'required'          => true,
            'validate_callback' => function ( $param ) {
                return is_array( $param );
            },
        ),
    ),
) );
```

Add the callback method:

```php
public static function move_folder( WP_REST_Request $request ) {
    $id          = (int) $request->get_param( 'id' );
    $parent_id   = (int) $request->get_param( 'parent_id' );
    $sibling_ids = array_map( 'intval', (array) $request->get_param( 'sibling_ids' ) );

    $term = get_term( $id, 'wp_virtual_folder' );
    if ( is_wp_error( $term ) || ! $term ) {
        return new WP_Error( 'not_found', 'Folder not found', array( 'status' => 404 ) );
    }

    $result = wp_update_term( $id, 'wp_virtual_folder', array( 'parent' => $parent_id ) );
    if ( is_wp_error( $result ) ) {
        return $result;
    }

    foreach ( $sibling_ids as $index => $sibling_id ) {
        update_term_meta( $sibling_id, 'wpmf_folder_order', $index * 10 );
    }

    return rest_ensure_response( array( 'success' => true ) );
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:php 2>&1 | grep -E "(FAIL|PASS|OK)"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add includes/class-wpmf-api.php tests/WpmfApiTest.php
git commit -m "feat: add POST /wpmf/v1/folder/{id}/move endpoint with sibling order assignment"
```

---

## Task 4: JS client functions

**Files:**
- Modify: `src/api/client.js`
- Test: `src/api/client.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `src/api/client.test.js`:

```js
import { getFolders, getItems, deleteFolder, moveFolder } from './client';

// ... (existing imports/mocks stay)

describe('deleteFolder', () => {
    beforeEach(() => {
        apiFetch.mockResolvedValue({ success: true, parent_id: 0 });
    });

    afterEach(() => {
        apiFetch.mockReset();
    });

    it('calls DELETE /wpmf/v1/folder/{id}', async () => {
        await deleteFolder(42);
        expect(apiFetch).toHaveBeenCalledWith({
            path: '/wpmf/v1/folder/42',
            method: 'DELETE',
        });
    });
});

describe('moveFolder', () => {
    beforeEach(() => {
        apiFetch.mockResolvedValue({ success: true });
    });

    afterEach(() => {
        apiFetch.mockReset();
    });

    it('calls POST /wpmf/v1/folder/{id}/move with parent_id and sibling_ids', async () => {
        await moveFolder(5, 3, [5, 7, 9]);
        expect(apiFetch).toHaveBeenCalledWith({
            path: '/wpmf/v1/folder/5/move',
            method: 'POST',
            data: { parent_id: 3, sibling_ids: [5, 7, 9] },
        });
    });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:unit -- --testPathPattern=client 2>&1 | grep -E "(FAIL|PASS|deleteFolder|moveFolder)"
```

Expected: `FAIL` — functions not yet exported.

- [ ] **Step 3: Add the two functions to `src/api/client.js`**

```js
export const deleteFolder = async (id) => {
    return await apiFetch({
        path: `/wpmf/v1/folder/${id}`,
        method: 'DELETE',
    });
};

export const moveFolder = async (id, parentId, siblingIds) => {
    return await apiFetch({
        path: `/wpmf/v1/folder/${id}/move`,
        method: 'POST',
        data: { parent_id: parentId, sibling_ids: siblingIds },
    });
};
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:unit -- --testPathPattern=client 2>&1 | grep -E "(FAIL|PASS)"
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/api/client.js src/api/client.test.js
git commit -m "feat: add deleteFolder and moveFolder JS API functions"
```

---

## Task 5: Guard folder drags in App.js handleDragEnd

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Update `handleDragEnd` in `src/index.js`**

Replace the existing `handleDragEnd` function:

```js
const handleDragEnd = async ({ active, over }) => {
    // Folder drags are handled by Sidebar's useDndMonitor
    if (active.data.current?.type === 'folder') return;
    // Gap zone drop targets have string IDs — skip for media drops
    if (!over || typeof over.id !== 'number') return;
    if (active.id === over.id) return;
    try {
        await moveItems([active.id], over.id);
        refreshGrid();
    } catch (err) {
        console.error('Move failed:', err);
    }
};
```

- [ ] **Step 2: Run the full JS test suite to confirm nothing is broken**

```bash
npm run test:unit 2>&1 | grep -E "(FAIL|PASS|Test Suites)"
```

Expected: all suites pass (no regressions).

- [ ] **Step 3: Commit**

```bash
git add src/index.js
git commit -m "fix: skip folder drags in App handleDragEnd, guard against gap zone IDs"
```

---

## Task 6: Sidebar delete UI

**Files:**
- Modify: `src/components/Sidebar.js`
- Test: `src/components/Sidebar.test.js`

- [ ] **Step 1: Update the Sidebar mock to include new API functions and write failing tests**

At the top of `src/components/Sidebar.test.js`, update the mock:

```js
jest.mock('../api/client', () => ({
    getFolders: jest.fn().mockResolvedValue([]),
    createFolder: jest.fn(),
    deleteFolder: jest.fn(),
    moveFolder: jest.fn(),
}));

import { getFolders, createFolder, deleteFolder, moveFolder } from '../api/client';
```

Add to `beforeEach` in the main `describe('Sidebar Component')`:

```js
deleteFolder.mockReset();
moveFolder.mockReset();
```

Add a new describe block at the end of `Sidebar.test.js`:

```js
describe('Sidebar — delete folder', () => {
    beforeEach(() => {
        getFolders.mockResolvedValue([
            { id: 1, name: 'To Delete', parent: 0, meta: { wpmf_folder_order: 0 } },
        ]);
        deleteFolder.mockReset();
        moveFolder.mockReset();
    });

    it('shows the delete button only when the folder is selected', async () => {
        await act(async () => {
            render(<Sidebar selectedFolderId={1} onSelectFolder={jest.fn()} />);
        });
        await waitFor(() => expect(screen.getByText(/To Delete/i)).toBeTruthy());
        expect(screen.getByRole('button', { name: /delete folder/i })).toBeTruthy();
    });

    it('does not show delete button when no folder is selected', async () => {
        await act(async () => {
            render(<Sidebar selectedFolderId={null} onSelectFolder={jest.fn()} />);
        });
        await waitFor(() => expect(screen.getByText(/To Delete/i)).toBeTruthy());
        expect(screen.queryByRole('button', { name: /delete folder/i })).toBeFalsy();
    });

    it('shows confirmation banner when delete button is clicked', async () => {
        await act(async () => {
            render(<Sidebar selectedFolderId={1} onSelectFolder={jest.fn()} />);
        });
        await waitFor(() => expect(screen.getByText(/To Delete/i)).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /delete folder/i }));
        expect(screen.getByRole('button', { name: /^Confirm$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeTruthy();
    });

    it('hides confirmation banner when Cancel is clicked', async () => {
        await act(async () => {
            render(<Sidebar selectedFolderId={1} onSelectFolder={jest.fn()} />);
        });
        await waitFor(() => expect(screen.getByText(/To Delete/i)).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /delete folder/i }));
        fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
        expect(screen.queryByRole('button', { name: /^Confirm$/i })).toBeFalsy();
    });

    it('calls deleteFolder and reloads folders when Confirm is clicked', async () => {
        deleteFolder.mockResolvedValue({ success: true, parent_id: 0 });
        getFolders
            .mockResolvedValueOnce([{ id: 1, name: 'To Delete', parent: 0, meta: { wpmf_folder_order: 0 } }])
            .mockResolvedValue([]);
        const onSelectFolder = jest.fn();

        await act(async () => {
            render(<Sidebar selectedFolderId={1} onSelectFolder={onSelectFolder} />);
        });
        await waitFor(() => expect(screen.getByText(/To Delete/i)).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /delete folder/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Confirm$/i }));
        });

        expect(deleteFolder).toHaveBeenCalledWith(1);
        await waitFor(() => expect(screen.queryByText(/To Delete/i)).toBeFalsy());
    });

    it('auto-selects parent folder after deletion', async () => {
        deleteFolder.mockResolvedValue({ success: true, parent_id: 0 });
        getFolders
            .mockResolvedValueOnce([{ id: 1, name: 'To Delete', parent: 0, meta: { wpmf_folder_order: 0 } }])
            .mockResolvedValue([]);
        const onSelectFolder = jest.fn();

        await act(async () => {
            render(<Sidebar selectedFolderId={1} onSelectFolder={onSelectFolder} />);
        });
        await waitFor(() => expect(screen.getByText(/To Delete/i)).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /delete folder/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Confirm$/i }));
        });

        await waitFor(() => expect(onSelectFolder).toHaveBeenCalledWith(null));
    });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:unit -- --testPathPattern=Sidebar 2>&1 | grep -E "(FAIL|PASS|delete folder)"
```

Expected: `FAIL`.

- [ ] **Step 3: Implement delete UI in `src/components/Sidebar.js`**

Add `deleteFolder` to the import at the top:

```js
import { getFolders, createFolder, deleteFolder } from '../api/client';
```

Add `confirmDeleteId` and `deleting` state to `Sidebar`:

```js
const [confirmDeleteId, setConfirmDeleteId] = useState(null);
const [deleting, setDeleting] = useState(false);
```

Add the `handleDelete` function inside `Sidebar`:

```js
const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
        const result = await deleteFolder(confirmDeleteId);
        const parentId = result?.parent_id ?? 0;
        setConfirmDeleteId(null);
        const updated = await getFolders();
        setFolders(updated);
        if (onSelectFolder && selectedFolderId === confirmDeleteId) {
            onSelectFolder(parentId || null);
        }
    } catch (err) {
        console.error('Delete failed:', err);
    } finally {
        setDeleting(false);
    }
};
```

Update `FolderItem` to accept and render the delete button and confirmation banner. Replace the entire `FolderItem` component:

```jsx
const FolderItem = ({
    folder, depth, isSelected, onSelect, hasChildren, isCollapsed, onToggle,
    onDeleteRequest, showConfirm, onConfirmDelete, onCancelDelete, deleting,
}) => {
    const { setNodeRef, isOver } = useDroppable({ id: folder.id });

    return (
        <>
            <li
                ref={setNodeRef}
                style={{
                    padding: '6px 8px 6px ' + (12 + depth * 16) + 'px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    fontWeight: isSelected ? '600' : 'normal',
                    background: isOver ? '#e8f4fb' : isSelected ? '#f0f6fc' : 'transparent',
                    border: isOver ? '1px dashed #007cba' : '1px solid transparent',
                    transition: 'background 0.1s',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasChildren ? (
                        <span
                            onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
                            style={{
                                cursor: 'pointer', display: 'inline-block', width: '16px',
                                textAlign: 'center', fontSize: '10px', userSelect: 'none',
                                transition: 'transform 0.15s',
                                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                            }}
                        >
                            &#9654;
                        </span>
                    ) : (
                        <span style={{ display: 'inline-block', width: '16px' }} />
                    )}
                    <span onClick={() => onSelect(folder.id)} style={{ flex: 1 }}>
                        📁 {folder.name}
                    </span>
                    {isSelected && (
                        <button
                            aria-label="Delete folder"
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(folder.id); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '2px 4px', color: '#cc0000', fontSize: '14px',
                            }}
                        >
                            🗑
                        </button>
                    )}
                </span>
            </li>
            {isSelected && showConfirm && (
                <li style={{
                    padding: '8px 12px',
                    background: '#fff5f5',
                    border: '1px solid #f5c6cb',
                    borderRadius: '3px',
                    fontSize: '12px',
                    listStyle: 'none',
                }}>
                    <p style={{ margin: '0 0 8px', color: '#721c24' }}>
                        Delete "{folder.name}"? Images and sub-folders will be moved to the parent.
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            className="components-button is-destructive"
                            onClick={onConfirmDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                            className="components-button is-secondary"
                            onClick={onCancelDelete}
                            disabled={deleting}
                        >
                            Cancel
                        </button>
                    </div>
                </li>
            )}
        </>
    );
};
```

Pass the new props through `FolderTree` and into `FolderItem`. Update `FolderTree`:

```jsx
const FolderTree = ({ nodes, depth = 0, selectedFolderId, onSelect, collapsedIds, onToggle, onDeleteRequest, confirmDeleteId, onConfirmDelete, onCancelDelete, deleting }) =>
    nodes.map((node) => {
        const isCollapsed = collapsedIds.has(node.id);
        return (
            <div key={node.id}>
                <FolderItem
                    folder={node}
                    depth={depth}
                    isSelected={selectedFolderId === node.id}
                    onSelect={onSelect}
                    hasChildren={node.children.length > 0}
                    isCollapsed={isCollapsed}
                    onToggle={onToggle}
                    onDeleteRequest={onDeleteRequest}
                    showConfirm={confirmDeleteId === node.id}
                    onConfirmDelete={onConfirmDelete}
                    onCancelDelete={onCancelDelete}
                    deleting={deleting}
                />
                {node.children.length > 0 && !isCollapsed && (
                    <FolderTree
                        nodes={node.children}
                        depth={depth + 1}
                        selectedFolderId={selectedFolderId}
                        onSelect={onSelect}
                        collapsedIds={collapsedIds}
                        onToggle={onToggle}
                        onDeleteRequest={onDeleteRequest}
                        confirmDeleteId={confirmDeleteId}
                        onConfirmDelete={onConfirmDelete}
                        onCancelDelete={onCancelDelete}
                        deleting={deleting}
                    />
                )}
            </div>
        );
    });
```

Update the `<FolderTree>` call inside `Sidebar`'s return:

```jsx
<FolderTree
    nodes={tree}
    selectedFolderId={selectedFolderId}
    onSelect={onSelectFolder}
    collapsedIds={collapsedIds}
    onToggle={toggleCollapse}
    onDeleteRequest={(id) => setConfirmDeleteId(id)}
    confirmDeleteId={confirmDeleteId}
    onConfirmDelete={handleDelete}
    onCancelDelete={() => setConfirmDeleteId(null)}
    deleting={deleting}
/>
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:unit -- --testPathPattern=Sidebar 2>&1 | grep -E "(FAIL|PASS|Test Suites)"
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.js src/components/Sidebar.test.js
git commit -m "feat: add folder delete button with inline confirmation banner"
```

---

## Task 7: Sidebar drag handle and folder reorganization

**Files:**
- Modify: `src/components/Sidebar.js`
- Test: `src/components/Sidebar.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/components/Sidebar.test.js`:

```js
describe('Sidebar — folder ordering', () => {
    beforeEach(() => {
        deleteFolder.mockReset();
        moveFolder.mockReset();
    });

    it('renders folders sorted by wpmf_folder_order ascending', async () => {
        getFolders.mockResolvedValue([
            { id: 1, name: 'Beta',  parent: 0, meta: { wpmf_folder_order: 20 } },
            { id: 2, name: 'Alpha', parent: 0, meta: { wpmf_folder_order: 10 } },
            { id: 3, name: 'Gamma', parent: 0, meta: { wpmf_folder_order: 30 } },
        ]);

        await act(async () => { render(<Sidebar />); });
        await waitFor(() => expect(screen.getByText(/Alpha/i)).toBeTruthy());

        const items = screen.getAllByText(/Alpha|Beta|Gamma/);
        expect(items[0].textContent).toMatch(/Alpha/);
        expect(items[1].textContent).toMatch(/Beta/);
        expect(items[2].textContent).toMatch(/Gamma/);
    });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:unit -- --testPathPattern=Sidebar 2>&1 | grep -E "(FAIL|folder ordering)"
```

Expected: `FAIL` — folders currently render in API order, not by `wpmf_folder_order`.

- [ ] **Step 3: Update `buildTree` to sort by `wpmf_folder_order`**

In `src/components/Sidebar.js`, replace the `buildTree` function:

```js
const buildTree = (folders, parentId = 0) => {
    if (!Array.isArray(folders)) return [];
    return folders
        .filter((f) => f && typeof f.id !== 'undefined' && (f.parent || 0) === parentId)
        .sort((a, b) => (a.meta?.wpmf_folder_order ?? 0) - (b.meta?.wpmf_folder_order ?? 0))
        .map((f) => ({ ...f, children: buildTree(folders, f.id) }));
};
```

- [ ] **Step 4: Run ordering test to confirm pass**

```bash
npm run test:unit -- --testPathPattern=Sidebar 2>&1 | grep -E "(FAIL|PASS|Test Suites)"
```

Expected: `PASS`.

- [ ] **Step 5: Add `useDraggable`, `useDndMonitor` imports and helper to Sidebar**

At the top of `src/components/Sidebar.js`, update the dnd-kit import:

```js
import { useDroppable, useDraggable, useDndMonitor } from '@dnd-kit/core';
```

Add the `isDescendantOf` helper above the `FolderItem` component:

```js
const isDescendantOf = (folders, ancestorId, checkId) => {
    if (!checkId || checkId === 0) return false;
    const folder = folders.find((f) => f.id === checkId);
    if (!folder) return false;
    if ((folder.parent || 0) === ancestorId) return true;
    return isDescendantOf(folders, ancestorId, folder.parent || 0);
};
```

- [ ] **Step 6: Add drag handle to `FolderItem`**

Inside `FolderItem`, add `useDraggable` and wire the handle. Replace the `FolderItem` component's opening lines (keep everything from Task 6, add below `useDroppable`):

```jsx
const FolderItem = ({
    folder, depth, isSelected, onSelect, hasChildren, isCollapsed, onToggle,
    onDeleteRequest, showConfirm, onConfirmDelete, onCancelDelete, deleting, isDraggingAny,
}) => {
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: folder.id });
    const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
        id: folder.id,
        data: { type: 'folder', folderId: folder.id },
    });

    return (
        <>
            <li
                ref={setDropRef}
                style={{
                    padding: '6px 8px 6px ' + (12 + depth * 16) + 'px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    fontWeight: isSelected ? '600' : 'normal',
                    opacity: isDragging ? 0.4 : 1,
                    background: isOver && isDraggingAny ? '#e8f4fb' : isSelected ? '#f0f6fc' : 'transparent',
                    border: isOver && isDraggingAny ? '1px dashed #007cba' : '1px solid transparent',
                    transition: 'background 0.1s',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isSelected && (
                        <span
                            ref={setDragRef}
                            {...listeners}
                            {...attributes}
                            style={{ cursor: 'grab', color: '#bbb', fontSize: '14px', userSelect: 'none', lineHeight: 1 }}
                            title="Drag to reorder"
                        >
                            ⠿
                        </span>
                    )}
                    {!isSelected && <span style={{ display: 'inline-block', width: '16px' }} />}
                    {hasChildren ? (
                        <span
                            onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
                            style={{
                                cursor: 'pointer', display: 'inline-block', width: '16px',
                                textAlign: 'center', fontSize: '10px', userSelect: 'none',
                                transition: 'transform 0.15s',
                                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                            }}
                        >
                            &#9654;
                        </span>
                    ) : (
                        <span style={{ display: 'inline-block', width: '16px' }} />
                    )}
                    <span onClick={() => onSelect(folder.id)} style={{ flex: 1 }}>
                        📁 {folder.name}
                    </span>
                    {isSelected && (
                        <button
                            aria-label="Delete folder"
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(folder.id); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '2px 4px', color: '#cc0000', fontSize: '14px',
                            }}
                        >
                            🗑
                        </button>
                    )}
                </span>
            </li>
            {isSelected && showConfirm && (
                <li style={{
                    padding: '8px 12px', background: '#fff5f5',
                    border: '1px solid #f5c6cb', borderRadius: '3px',
                    fontSize: '12px', listStyle: 'none',
                }}>
                    <p style={{ margin: '0 0 8px', color: '#721c24' }}>
                        Delete "{folder.name}"? Images and sub-folders will be moved to the parent.
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="components-button is-destructive" onClick={onConfirmDelete} disabled={deleting}>
                            {deleting ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button className="components-button is-secondary" onClick={onCancelDelete} disabled={deleting}>
                            Cancel
                        </button>
                    </div>
                </li>
            )}
        </>
    );
};
```

- [ ] **Step 7: Add `GapZone` component**

Add the `GapZone` component above `FolderTree`:

```jsx
const GapZone = ({ id, isActive }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{
                height: isActive ? (isOver ? '16px' : '8px') : '2px',
                background: isOver ? '#007cba' : 'transparent',
                borderRadius: '2px',
                margin: '1px 0',
                transition: 'height 0.1s, background 0.1s',
            }}
        />
    );
};
```

- [ ] **Step 8: Update `FolderTree` to render gap zones between siblings**

Replace the `FolderTree` component:

```jsx
const FolderTree = ({
    nodes, depth = 0, selectedFolderId, onSelect, collapsedIds, onToggle,
    onDeleteRequest, confirmDeleteId, onConfirmDelete, onCancelDelete, deleting,
    isDraggingAny, parentId = 0,
}) => (
    <>
        <GapZone id={`gap:${parentId}:0`} isActive={isDraggingAny} />
        {nodes.map((node, index) => {
            const isCollapsed = collapsedIds.has(node.id);
            return (
                <div key={node.id}>
                    <FolderItem
                        folder={node}
                        depth={depth}
                        isSelected={selectedFolderId === node.id}
                        onSelect={onSelect}
                        hasChildren={node.children.length > 0}
                        isCollapsed={isCollapsed}
                        onToggle={onToggle}
                        onDeleteRequest={onDeleteRequest}
                        showConfirm={confirmDeleteId === node.id}
                        onConfirmDelete={onConfirmDelete}
                        onCancelDelete={onCancelDelete}
                        deleting={deleting}
                        isDraggingAny={isDraggingAny}
                    />
                    {node.children.length > 0 && !isCollapsed && (
                        <FolderTree
                            nodes={node.children}
                            depth={depth + 1}
                            selectedFolderId={selectedFolderId}
                            onSelect={onSelect}
                            collapsedIds={collapsedIds}
                            onToggle={onToggle}
                            onDeleteRequest={onDeleteRequest}
                            confirmDeleteId={confirmDeleteId}
                            onConfirmDelete={onConfirmDelete}
                            onCancelDelete={onCancelDelete}
                            deleting={deleting}
                            isDraggingAny={isDraggingAny}
                            parentId={node.id}
                        />
                    )}
                    <GapZone id={`gap:${parentId}:${index + 1}`} isActive={isDraggingAny} />
                </div>
            );
        })}
    </>
);
```

- [ ] **Step 9: Add `isDraggingFolderId` state and `useDndMonitor` to `Sidebar`**

Add state inside `Sidebar`:

```js
const [isDraggingFolderId, setIsDraggingFolderId] = useState(null);
```

Add the `handleFolderMove` function inside `Sidebar`:

```js
const handleFolderMove = async (draggedId, newParentId, siblingIds) => {
    try {
        await moveFolder(draggedId, newParentId, siblingIds);
        const updated = await getFolders();
        setFolders(updated);
    } catch (err) {
        console.error('Folder move failed:', err);
    }
};
```

Add `useDndMonitor` inside `Sidebar` (after the state declarations):

```js
useDndMonitor({
    onDragStart({ active }) {
        if (active.data.current?.type === 'folder') {
            setIsDraggingFolderId(active.id);
        }
    },
    onDragEnd({ active, over }) {
        setIsDraggingFolderId(null);
        if (active.data.current?.type !== 'folder') return;
        if (!over) return;

        const draggedId = active.id;
        let newParentId;
        let insertPosition;

        const overId = String(over.id);
        if (overId.startsWith('gap:')) {
            const parts = overId.split(':');
            newParentId = Number(parts[1]);
            insertPosition = Number(parts[2]);
        } else if (typeof over.id === 'number' && over.id !== draggedId) {
            newParentId = over.id;
            insertPosition = Infinity; // append as last child
        } else {
            return;
        }

        if (newParentId === draggedId) return;
        if (isDescendantOf(folders, draggedId, newParentId)) return;

        const siblings = folders
            .filter((f) => (f.parent || 0) === newParentId && f.id !== draggedId)
            .sort((a, b) => (a.meta?.wpmf_folder_order ?? 0) - (b.meta?.wpmf_folder_order ?? 0));

        const siblingIds = siblings.map((s) => s.id);
        siblingIds.splice(Math.min(insertPosition, siblingIds.length), 0, draggedId);

        handleFolderMove(draggedId, newParentId, siblingIds);
    },
});
```

Add `moveFolder` to the import at the top of `Sidebar.js`:

```js
import { getFolders, createFolder, deleteFolder, moveFolder } from '../api/client';
```

Update the `<FolderTree>` call in `Sidebar`'s return to pass `isDraggingAny`:

```jsx
<FolderTree
    nodes={tree}
    selectedFolderId={selectedFolderId}
    onSelect={onSelectFolder}
    collapsedIds={collapsedIds}
    onToggle={toggleCollapse}
    onDeleteRequest={(id) => setConfirmDeleteId(id)}
    confirmDeleteId={confirmDeleteId}
    onConfirmDelete={handleDelete}
    onCancelDelete={() => setConfirmDeleteId(null)}
    deleting={deleting}
    isDraggingAny={!!isDraggingFolderId}
    parentId={0}
/>
```

- [ ] **Step 10: Run the full test suite**

```bash
npm run test:unit 2>&1 | grep -E "(FAIL|PASS|Test Suites)"
```

Expected: all test suites pass.

- [ ] **Step 11: Commit**

```bash
git add src/components/Sidebar.js src/components/Sidebar.test.js
git commit -m "feat: add folder drag-to-reorder and nest with gap drop zones and useDndMonitor"
```

---

## Manual Smoke Test Checklist

After all tasks, install the built plugin and verify:

- [ ] Create two sibling folders A and B. Drag A's ⠿ handle and drop it onto B → A becomes a child of B.
- [ ] Drag A's ⠿ handle and drop it in the gap above B → A moves back to root, sorted before B.
- [ ] Select A, click 🗑, see confirmation banner with "Delete "A"? Images and sub-folders will be moved to the parent."
- [ ] Click Cancel → banner disappears, folder still there.
- [ ] Create folder with a sub-folder and one image. Delete the parent → sub-folder appears at root level, image appears in Inbox.
- [ ] Delete a root-level folder with an image → image moves to Inbox (Root).
- [ ] Media drag-and-drop onto folders still works (no regression).
