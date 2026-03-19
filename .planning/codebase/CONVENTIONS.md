# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- Components: PascalCase with `.js` extension (`Sidebar.js`, `Grid.js`, `Inspector.js`)
- API/utilities: camelCase with `.js` extension (`client.js`)
- Tests: Component name + `.test.js` suffix (`Sidebar.test.js`)
- PHP Classes: PascalCase with `class-` prefix and hyphens separating words (`class-wpmf-api.php`, `class-wpmf-taxonomy.php`)
- PHP files: Always wrapped in `if ( ! defined( 'ABSPATH' ) ) { exit; }` security check

**Functions:**
- JavaScript: camelCase for regular functions and arrow functions
  - Exported functions: `getFolders`, `createFolder`, `getItems`, `moveItems`
  - Internal utility functions: `buildTree`, `parseNames`, `openWpMediaUploader`
- PHP Static methods: camelCase on static classes (`WPMF_API::register_routes()`, `WPMF_API::check_permissions()`)

**Variables:**
- React hooks: camelCase prefixed with `set` for state setters (`setFolders`, `setIsCreating`, `setSelectedFolderId`)
- Local variables: camelCase (`folderLabel`, `newFolderName`, `tagInput`)
- Object/array references: camelCase (`itemIds`, `folderId`, `termCache`)
- Boolean flags: prefixed with `is` or `has` (`isCreating`, `isSelected`, `isOver`, `hasMore`)

**Types/Classes:**
- React Components: PascalCase (`Sidebar`, `Grid`, `Inspector`, `MediaItem`, `FolderItem`, `FolderTree`)
- PHP Classes: PascalCase with WPMF_ prefix (`WPMF_API`, `WPMF_Taxonomy`, `WPMF_Tag_Mapper`, `WPMF_Admin_Page`)

**Constants:**
- PHP: UPPERCASE_WITH_UNDERSCORES (`WPMF_VERSION`, `WPMF_PLUGIN_DIR`, `WPMF_PLUGIN_URL`)
- Not detected in JavaScript

## Code Style

**Formatting:**
- No explicit linting/formatting tool detected (no `.eslintrc`, `.prettierrc`, or similar)
- 4-space indentation appears consistent in both JavaScript and PHP
- Semicolons used throughout JavaScript
- Trailing commas in objects/arrays

**Linting:**
- No linting configuration detected
- Code follows implicit WordPress/React conventions
- Type safety: Not enforced (no TypeScript or PropTypes detected)

## Import Organization

**Order (JavaScript):**
1. Third-party dependencies (`@wordpress/element`, `@dnd-kit/*`)
2. Local relative imports (`./components/Sidebar`, `../api/client`)
3. Style imports (`.scss` files at end)

**Example from `src/index.js`:**
```javascript
import { render, useState, useCallback } from '@wordpress/element';
import Sidebar from './components/Sidebar';
import Grid from './components/Grid';
import Inspector from './components/Inspector';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { moveItems } from './api/client';

import './style.scss';
```

**Path Aliases:**
- Not used; relative paths with `./` and `../` throughout

**PHP Imports:**
- Class autoloading via `require_once` in `class-wpmf-autoloader.php`
- WordPress REST API constants and functions via `add_action`, `register_rest_route`, etc.

## Error Handling

**Patterns:**
- Try/catch blocks for async operations wrapping API calls
- `.catch(() => {})` for promise chains (silent failures, no logging)
- `console.error()` for logging errors before returning fallback values
- Validation in REST endpoints via `validate_callback` in route args
- Permission checks via `check_permissions()` method
- `is_wp_error()` checks for WordPress operations before returning error responses

**Example from `src/components/Sidebar.js`:**
```javascript
try {
    const folder = await createFolder(name, parentId);
    setFolders((prev) => [...prev, folder]);
    setNewFolderName('');
    setIsCreating(false);
} catch (err) {
    console.error('Failed to create folder:', err);
} finally {
    setCreating(false);
}
```

**PHP Example from `includes/class-wpmf-api.php`:**
```php
if ( is_wp_error( $status ) ) {
    $results[] = array( 'id' => $item_id, 'status' => 'error', 'message' => $status->get_error_message() );
} else {
    $results[] = array( 'id' => $item_id, 'status' => 'success' );
}
```

## Logging

**Framework:** `console.error()`, `console.warn()` (no structured logging framework)

**Patterns:**
- Only errors and warnings are logged
- Logging used in error paths and fallback scenarios
- Example: `console.error('Move failed:', err)` in `src/index.js:29`
- Example: `console.warn('wp.media not available')` in `src/components/Grid.js:85`
- PHP uses silent error handling (`.catch(() => {})`) with `console.error()` for reporting failures

## Comments

**When to Comment:**
- Inline comments explain non-obvious logic
- Comments above functions describe purpose and behavior
- Example: `// Which folder is currently selected in the sidebar (null = Root/Inbox)` in `src/index.js:11`
- Example: `// A single droppable folder row` in `src/components/Sidebar.js:5`

**JSDoc/TSDoc:**
- Not detected; no formal documentation comments
- Inline explanation preferred

**PHP Comments:**
- Plugin header comments with metadata (Plugin Name, Description, Version, Author, License)
- Inline comments for logic that may not be immediately clear
- Example: `// Root inbox drop target` in `src/components/Sidebar.js:66`

## Function Design

**Size:**
- Small, focused functions (most 20-50 lines)
- Larger components break logic into helper functions
- Example: `buildTree()`, `FolderTree()`, and `FolderItem()` in `src/components/Sidebar.js` are separate utility and component functions

**Parameters:**
- Destructured props in React components: `{ folder, depth, isSelected, onSelect }`
- Named parameters in API functions: `async (folderId = 0, page = 1, perPage = 20)`
- Default parameters used frequently

**Return Values:**
- Explicit returns in all functions
- Promises returned from async functions
- JSX returned from React components
- Arrays or objects from utility functions

## Module Design

**Exports:**
- Named exports via `export const` in API files (`src/api/client.js`)
- Default exports for React components: `export default Sidebar`, `export default Grid`
- PHP static methods accessed via class reference: `WPMF_API::init()`

**Barrel Files:**
- Not used; components imported directly from file paths

**File Organization:**
- One component per file
- API functions grouped in single file (`src/api/client.js`)
- Helper functions inline or as separate functions in same file

## Asynchronous Patterns

**Async/Await:**
- Used consistently for API calls: `const response = await apiFetch({ path })`
- Wrapped in try/catch blocks
- `useEffect` hooks use async functions defined inside the hook

**Example from `src/components/Sidebar.js`:**
```javascript
const handleCreate = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreating(true);
    try {
        const parentId = selectedFolderId || 0;
        const folder = await createFolder(name, parentId);
        setFolders((prev) => [...prev, folder]);
    } catch (err) {
        console.error('Failed to create folder:', err);
    } finally {
        setCreating(false);
    }
};
```

---

*Convention analysis: 2026-03-19*
