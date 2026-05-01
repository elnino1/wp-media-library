# Testing Patterns

**Analysis Date:** 2026-03-19

## Test Framework

**JavaScript/React:**
- Runner: Jest (via `@wordpress/scripts`)
- Testing Library: `@testing-library/react` v14.0.0
- Assertion: Jest built-in assertions
- Config: Configured through `@wordpress/scripts` (no visible Jest config file)

**Run Commands:**
```bash
npm run test:unit              # Run all JavaScript unit tests
```

**PHP:**
- Runner: PHPUnit v9.6 (via `phpunit/phpunit`)
- Test Base: `WP_UnitTestCase` (WordPress test utilities)
- Polyfills: `yoast/phpunit-polyfills` v2.0
- Config: `phpunit.xml.dist`

**Run Commands:**
```bash
npm run test:php              # Run PHP tests via wp-env (configured in package.json)
```

## Test File Organization

**JavaScript:**
- Location: Co-located with source files
- Pattern: `.test.js` suffix
- Example: `src/components/Sidebar.test.js` tests `src/components/Sidebar.js`
- Only one test file detected: `src/components/Sidebar.test.js`

**PHP:**
- Location: Separate `tests/` directory
- Naming: `Test.php` suffix (configured in `phpunit.xml.dist`)
- Test Suite: "WP Media Folders Test Suite" in `phpunit.xml.dist`
- Bootstrap: `tests/bootstrap.php` manually loads plugin via `_manually_load_plugin()`

## Test Structure

**JavaScript Suite Organization (from `src/components/Sidebar.test.js`):**
```javascript
describe('Sidebar Component', () => {
    beforeEach(() => {
        // Reset mocks before each test
        getFolders.mockResolvedValue([]);
        createFolder.mockReset();
    });

    it('renders the root inbox correctly', async () => {
        // Test implementation
    });
});
```

**Patterns:**
- Setup: `beforeEach()` resets mocks
- Teardown: Not needed (mocks reset per test)
- Assertion: Jest `expect()` assertions
- Async testing: `await act(async () => { ... })`

**PHP Test Example (from `tests/WpmfApiTest.php`):**
```php
class WpmfApiTest extends WP_UnitTestCase {
    public function test_api_class_exists() {
        $this->assertTrue( class_exists( 'WPMF_API' ) );
    }
}
```

**Patterns:**
- Extends `WP_UnitTestCase`
- Test methods start with `test_`
- Assertions: `$this->assertTrue()`, `$this->assertContains()`
- No setup/teardown detected in current tests

## Mocking

**Framework:** Jest `jest.mock()`

**Patterns (from `src/components/Sidebar.test.js`):**
```javascript
jest.mock('../api/client', () => ({
    getFolders: jest.fn().mockResolvedValue([]),
    createFolder: jest.fn(),
}));

import { getFolders, createFolder } from '../api/client';

// In beforeEach:
beforeEach(() => {
    getFolders.mockResolvedValue([]);
    createFolder.mockReset();
});

// In test:
createFolder.mockResolvedValue({ id: 42, name: 'My New Folder' });
```

**What to Mock:**
- External API calls via `jest.mock('../api/client', ...)`
- All async functions with `.mockResolvedValue()` or `.mockRejectedValue()`
- Reset mocks in `beforeEach()` for test isolation

**What NOT to Mock:**
- React component rendering
- User interactions via `fireEvent`
- DOM queries and assertions

## Testing React Components

**Pattern - Async Rendering with act():**
```javascript
it('renders the root inbox correctly', async () => {
    await act(async () => { render(<Sidebar />); });
    expect(screen.getByText(/Inbox \(Root\)/i)).toBeTruthy();
});
```

**Pattern - User Interaction:**
```javascript
it('shows the name input when + New Folder is clicked', async () => {
    await act(async () => { render(<Sidebar />); });
    fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
    expect(screen.getByPlaceholderText(/Folder name/i)).toBeTruthy();
});
```

**Pattern - Async Assertion with waitFor():**
```javascript
it('calls createFolder and shows the new folder after pressing Enter', async () => {
    createFolder.mockResolvedValue({ id: 42, name: 'My New Folder' });
    await act(async () => { render(<Sidebar />); });

    fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
    fireEvent.change(screen.getByPlaceholderText(/Folder name/i), { target: { value: 'My New Folder' } });
    await act(async () => {
        fireEvent.keyDown(screen.getByPlaceholderText(/Folder name/i), { key: 'Enter' });
    });

    expect(createFolder).toHaveBeenCalledWith('My New Folder');
    await waitFor(() => expect(screen.getByText(/My New Folder/i)).toBeTruthy());
});
```

**Selectors:**
- `screen.getByText(/pattern/i)` with regex patterns
- `screen.getByRole('button', { name: /pattern/i })`
- `screen.getByPlaceholderText(/pattern/i)`
- `screen.queryByPlaceholderText()` for non-existent elements (returns null, not error)

## Fixtures and Factories

**Test Data:**
- Inline mock data in test files
- Example from `src/components/Sidebar.test.js`:
```javascript
getFolders.mockResolvedValue([
    { id: 1, name: 'Existing Folder' },
]);

createFolder.mockResolvedValue({ id: 42, name: 'My New Folder' });
```

**Location:**
- No separate fixtures directory detected
- Mock data defined in-test or via `jest.mock()` setup

## Coverage

**Requirements:** Not detected - no coverage configuration or threshold enforced

**Current Coverage:**
- Only 1 JavaScript test file: `src/components/Sidebar.test.js` (tests Sidebar component only)
- Significant untested components: `Grid.js`, `Inspector.js`, `MediaItem`, `FolderItem`, `FolderTree`, `app` entry point
- API client untested: `src/api/client.js` (no test file)
- PHP: 3 tests in `tests/WpmfApiTest.php` covering basic class/taxonomy existence

## Test Types

**Unit Tests:**
- Scope: React component behavior and user interactions
- Approach: Jest + React Testing Library
- Example: `Sidebar.test.js` tests folder creation, input visibility, button states
- File: `src/components/Sidebar.test.js`

**Integration Tests:**
- PHP only: Testing REST API class registration and taxonomy attachment
- File: `tests/WpmfApiTest.php`
- Setup: Uses `WP_UnitTestCase` which provides WordPress environment

**E2E Tests:**
- Not implemented
- No E2E framework (Cypress, Playwright, etc.) detected

## PHP Testing Details

**Bootstrap Process (from `tests/bootstrap.php`):**
1. Locates WordPress test library via `WP_TESTS_DIR` environment variable
2. Loads WordPress test functions
3. Configures polyfills path for PHP 5.9+ compatibility
4. Manually loads the plugin via `_manually_load_plugin()` filter
5. Initializes WordPress test bootstrap

**Running PHP Tests:**
```bash
npm run test:php
```
This uses `wp-env` to run PHPUnit in an isolated WordPress container.

**PHP Test Pattern (from `tests/WpmfApiTest.php`):**
```php
class WpmfApiTest extends WP_UnitTestCase {
    public function test_taxonomy_registers_correctly() {
        $this->assertTrue( taxonomy_exists( 'wp_virtual_folder' ), 'Virtual folder taxonomy should be registered.' );
    }

    public function test_taxonomy_attached_to_media() {
        $tax_object = get_taxonomy( 'wp_virtual_folder' );
        $this->assertContains( 'attachment', $tax_object->object_type, 'Virtual folders should connect to attachments.' );
    }
}
```

## Common Patterns

**Async Testing Pattern:**
```javascript
// Always wrap async operations in act()
await act(async () => {
    // Perform async action (fire event, wait for state)
});

// For state updates from async operations, use waitFor()
await waitFor(() => {
    // Assert state has updated
});
```

**Error Testing:**
- Not detected in current test suite
- No tests for error paths or failed API calls
- Future tests should cover: failed API responses, permission errors, network failures

**Mock Reset Pattern:**
```javascript
// Before each test, reset all mocks
beforeEach(() => {
    getFolders.mockResolvedValue([]);
    createFolder.mockReset();
});

// In each test, configure mock behavior
createFolder.mockResolvedValue({ id: 42, name: 'My New Folder' });
```

## Coverage Gaps

**Untested JavaScript:**
- `Grid.js` component and pagination logic
- `Inspector.js` component and tag mapping
- `MediaItem` and `FolderItem` components
- `FolderTree` recursive rendering
- API client functions (`client.js`)
- Error handling and failed API calls
- Edge cases in state management

**Untested PHP:**
- `move_items()` endpoint logic and permission checks
- `create_folder()` and `get_items()` endpoints
- WooCommerce integration via tag mapping
- Error responses and validation failures
- Actual media item moving and folder management

---

*Testing analysis: 2026-03-19*
