import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import apiFetch from '@wordpress/api-fetch';
import Inspector from './Inspector';

jest.mock('@wordpress/api-fetch', () => jest.fn());

// Route apiFetch calls by "METHOD path" key, with defaults for all standard calls
const mockApiFetch = (overrides = {}) => {
    apiFetch.mockImplementation(({ path, method = 'GET', data }) => {
        const key = `${method} ${path}`;
        if (overrides[key]) return overrides[key](data);
        if (overrides[path]) return overrides[path](data);

        if (path === '/wp/v2/tags?per_page=100') return Promise.resolve([]);
        if (path === '/wp/v2/categories?per_page=100') return Promise.resolve([]);
        if (path.startsWith('/wp/v2/wpmf_folders/') && method === 'GET')
            return Promise.resolve({ meta: { wpmf_mapped_post_tags: [], wpmf_mapped_product_cats: [] } });
        if (path.startsWith('/wp/v2/wpmf_folders/') && method === 'POST')
            return Promise.resolve({});
        if (path === '/wp/v2/tags' && method === 'POST')
            return Promise.resolve({ id: 99, name: data?.name });
        if (path === '/wp/v2/categories' && method === 'POST')
            return Promise.resolve({ id: 100, name: data?.name });
        return Promise.resolve({});
    });
};

afterEach(() => {
    apiFetch.mockReset();
});

// ─── parseNames behavior (tested via component tag input) ───────────────────

describe('Inspector — parseNames via tag input', () => {
    it('splits comma-separated names into individual term creation calls', async () => {
        // Arrange
        mockApiFetch();
        await act(async () => { render(<Inspector folderId={5} />); });

        // Act — type two comma-separated tag names and save (first input = tags)
        const [tagInput] = screen.getAllByPlaceholderText(/comma-separated names/i);
        fireEvent.change(tagInput, { target: { value: 'tag one, tag two' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save Mappings/i }));
        });

        // Assert — two separate POST /wp/v2/tags calls, one per name
        await waitFor(() => {
            const posts = apiFetch.mock.calls.filter(
                ([{ path, method }]) => path === '/wp/v2/tags' && method === 'POST'
            );
            expect(posts).toHaveLength(2);
            expect(posts.map(([{ data }]) => data.name)).toEqual(
                expect.arrayContaining(['tag one', 'tag two'])
            );
        });
    });

    it('trims whitespace from each name before creating terms', async () => {
        // Arrange
        mockApiFetch();
        await act(async () => { render(<Inspector folderId={5} />); });

        // Act
        const [tagInput] = screen.getAllByPlaceholderText(/comma-separated names/i);
        fireEvent.change(tagInput, { target: { value: '  trimmed tag  ,  another  ' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save Mappings/i }));
        });

        // Assert — names are trimmed before posting
        await waitFor(() => {
            const names = apiFetch.mock.calls
                .filter(([{ path, method }]) => path === '/wp/v2/tags' && method === 'POST')
                .map(([{ data }]) => data.name);
            expect(names).toContain('trimmed tag');
            expect(names).toContain('another');
            expect(names).not.toContain('  trimmed tag  ');
        });
    });

    it('filters out empty entries produced by trailing or double commas', async () => {
        // Arrange
        mockApiFetch();
        await act(async () => { render(<Inspector folderId={5} />); });

        // Act — trailing commas + double comma
        const [tagInput] = screen.getAllByPlaceholderText(/comma-separated names/i);
        fireEvent.change(tagInput, { target: { value: 'real tag,,,' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save Mappings/i }));
        });

        // Assert — exactly 1 POST, empty entries skipped
        await waitFor(() => {
            const posts = apiFetch.mock.calls.filter(
                ([{ path, method }]) => path === '/wp/v2/tags' && method === 'POST'
            );
            expect(posts).toHaveLength(1);
            expect(posts[0][0].data.name).toBe('real tag');
        });
    });
});

// ─── handleSave — term existence check ──────────────────────────────────────

describe('Inspector — handleSave skips known terms', () => {
    it('does not POST a tag that already exists in termCache', async () => {
        // Arrange — termCache pre-populated with 'existing tag'
        mockApiFetch({
            '/wp/v2/tags?per_page=100': () =>
                Promise.resolve([{ id: 1, name: 'existing tag' }]),
        });
        await act(async () => { render(<Inspector folderId={5} />); });

        // Wait for termCache to load (known term visible in tag input via reverse-lookup is not needed;
        // we just need the effect to have run once so termCache is populated)
        await waitFor(() => {
            // termCache is loaded when the GET tags call has been made
            const tagGet = apiFetch.mock.calls.find(
                ([{ path }]) => path === '/wp/v2/tags?per_page=100'
            );
            expect(tagGet).toBeTruthy();
        });

        // Act — type both existing and new tag
        const [tagInput] = screen.getAllByPlaceholderText(/comma-separated names/i);
        fireEvent.change(tagInput, { target: { value: 'existing tag, new tag' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save Mappings/i }));
        });

        // Assert — only 'new tag' is POSTed, 'existing tag' is skipped
        await waitFor(() => {
            const names = apiFetch.mock.calls
                .filter(([{ path, method }]) => path === '/wp/v2/tags' && method === 'POST')
                .map(([{ data }]) => data.name);
            expect(names).toContain('new tag');
            expect(names).not.toContain('existing tag');
        });
    });
});

// ─── handleSave — Promise.allSettled partial failure ────────────────────────

describe('Inspector — handleSave proceeds on partial failure', () => {
    it('still POSTs meta save even when one term creation fails', async () => {
        // Arrange — second tag creation fails, first succeeds
        let tagCallCount = 0;
        mockApiFetch({
            'POST /wp/v2/tags': (data) => {
                tagCallCount++;
                if (tagCallCount === 2) {
                    return Promise.reject(new Error('Tag creation failed'));
                }
                return Promise.resolve({ id: 42, name: data?.name });
            },
        });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => { render(<Inspector folderId={5} />); });

        const [tagInput] = screen.getAllByPlaceholderText(/comma-separated names/i);
        fireEvent.change(tagInput, { target: { value: 'ok tag, bad tag' } });

        // Act
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save Mappings/i }));
        });

        // Assert — meta POST is still called despite one failed term creation
        await waitFor(() => {
            const metaSave = apiFetch.mock.calls.find(
                ([{ path, method }]) =>
                    path === '/wp/v2/wpmf_folders/5' && method === 'POST'
            );
            expect(metaSave).toBeTruthy();
        });

        consoleSpy.mockRestore();
    });
});

// ─── handleSave — UI rendering ──────────────────────────────────────────────

describe('Inspector — rendering', () => {
    it('renders empty state (no inputs) when folderId is not provided', async () => {
        // Arrange + Act
        mockApiFetch();
        await act(async () => { render(<Inspector folderId={null} />); });

        // Assert
        expect(
            screen.getByText(/Select a folder to configure its tag mappings/i)
        ).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Save Mappings/i })).toBeFalsy();
    });

    it('renders two inputs and a save button when folderId is given', async () => {
        // Arrange + Act
        mockApiFetch();
        await act(async () => { render(<Inspector folderId={7} />); });

        // Assert
        const inputs = screen.getAllByPlaceholderText(/comma-separated names/i);
        expect(inputs).toHaveLength(2);
        expect(screen.getByRole('button', { name: /Save Mappings/i })).toBeTruthy();
    });

    it('calls POST /wp/v2/wpmf_folders/:id with tag and category IDs on save', async () => {
        // Arrange — pre-existing tag id=1
        mockApiFetch({
            '/wp/v2/tags?per_page=100': () =>
                Promise.resolve([{ id: 1, name: 'my tag' }]),
        });
        await act(async () => { render(<Inspector folderId={5} />); });

        // Wait for cache to load
        await waitFor(() => {
            expect(apiFetch.mock.calls.find(
                ([{ path }]) => path === '/wp/v2/tags?per_page=100'
            )).toBeTruthy();
        });

        const [tagInput] = screen.getAllByPlaceholderText(/comma-separated names/i);
        fireEvent.change(tagInput, { target: { value: 'my tag' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save Mappings/i }));
        });

        // Assert — meta save called with the resolved tag ID
        await waitFor(() => {
            const metaSave = apiFetch.mock.calls.find(
                ([{ path, method }]) => path === '/wp/v2/wpmf_folders/5' && method === 'POST'
            );
            expect(metaSave).toBeTruthy();
            expect(metaSave[0].data.meta.wpmf_mapped_post_tags).toContain(1);
        });
    });

    it('logs error when the meta save POST rejects', async () => {
        // Arrange
        mockApiFetch({
            'POST /wp/v2/wpmf_folders/5': () =>
                Promise.reject(new Error('Network error')),
        });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => { render(<Inspector folderId={5} />); });

        // Act
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save Mappings/i }));
        });

        // Assert — error is logged
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to save folder mappings:',
                expect.any(Error)
            );
        });

        consoleSpy.mockRestore();
    });
});

/*
 * ⚠️  Bug discovered during test generation:
 *
 * Inspector.js has a race condition between handleSave's setSaveStatus('Saved!')
 * and the folder-loading useEffect's setSaveStatus('').
 *
 * Sequence after clicking Save with empty inputs (no new terms):
 *   1. handleSave → setTermCache({ ...termCache }) (new object reference, even if same content)
 *   2. termCache change triggers useEffect([folderId, termCache])
 *   3. useEffect calls GET /wp/v2/wpmf_folders/:id → setSaveStatus('')
 *   4. handleSave completes → setSaveStatus('Saved!')
 *   5. useEffect's GET resolves → setSaveStatus('') (clears the message)
 *
 * Result: 'Saved!' briefly appears and is immediately cleared. In production,
 * real API latency gives the user a moment to see it, but it is not persistent.
 *
 * Fix: Only call setTermCache(updatedCache) when updatedCache contains NEW entries
 * that weren't in the previous termCache — avoids unnecessary useEffect re-runs.
 */
