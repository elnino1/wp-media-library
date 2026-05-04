import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Sidebar from './Sidebar';

// Mock dnd-kit/core so Sidebar tests don't require a DndContext wrapper
jest.mock('@dnd-kit/core', () => ({
    useDroppable: jest.fn(() => ({ setNodeRef: jest.fn(), isOver: false })),
    useDraggable: jest.fn(() => ({
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        isDragging: false,
    })),
    useDndMonitor: jest.fn(),
}));

// Mock the API client so tests don't make real network calls
jest.mock('../api/client', () => ({
    getFolders: jest.fn().mockResolvedValue([]),
    createFolder: jest.fn(),
    deleteFolder: jest.fn(),
    moveFolder: jest.fn(),
}));

import { getFolders, createFolder, deleteFolder, moveFolder } from '../api/client';

describe('Sidebar Component', () => {
    beforeEach(() => {
        getFolders.mockResolvedValue([]);
        createFolder.mockReset();
        deleteFolder.mockReset();
        moveFolder.mockReset();
    });

    it('renders the root inbox correctly', async () => {
        await act(async () => { render(<Sidebar />); });
        expect(screen.getByText(/Inbox \(Root\)/i)).toBeTruthy();
    });

    it('renders the + New Folder button initially', async () => {
        await act(async () => { render(<Sidebar />); });
        expect(screen.getByRole('button', { name: /\+ New Folder/i })).toBeTruthy();
    });

    it('shows the name input when + New Folder is clicked', async () => {
        await act(async () => { render(<Sidebar />); });
        fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
        expect(screen.getByPlaceholderText(/Folder name/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /^Add$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeTruthy();
    });

    it('hides the input and restores the button when Cancel is clicked', async () => {
        await act(async () => { render(<Sidebar />); });
        fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(screen.getByRole('button', { name: /\+ New Folder/i })).toBeTruthy();
        expect(screen.queryByPlaceholderText(/Folder name/i)).toBeFalsy();
    });

    it('hides the input and restores the button when Escape is pressed', async () => {
        await act(async () => { render(<Sidebar />); });
        fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
        fireEvent.keyDown(screen.getByPlaceholderText(/Folder name/i), { key: 'Escape' });
        expect(screen.getByRole('button', { name: /\+ New Folder/i })).toBeTruthy();
    });

    it('calls createFolder and shows the new folder after pressing Enter', async () => {
        createFolder.mockResolvedValue({ id: 42, name: 'My New Folder' });
        await act(async () => { render(<Sidebar />); });

        fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
        fireEvent.change(screen.getByPlaceholderText(/Folder name/i), { target: { value: 'My New Folder' } });
        await act(async () => {
            fireEvent.keyDown(screen.getByPlaceholderText(/Folder name/i), { key: 'Enter' });
        });

        expect(createFolder).toHaveBeenCalledWith('My New Folder', 0);
        await waitFor(() => expect(screen.getByText(/My New Folder/i)).toBeTruthy());
        // Input should be gone and button restored
        expect(screen.getByRole('button', { name: /\+ New Folder/i })).toBeTruthy();
    });

    it('calls createFolder when the Add button is clicked', async () => {
        createFolder.mockResolvedValue({ id: 99, name: 'Another Folder' });
        await act(async () => { render(<Sidebar />); });

        fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
        fireEvent.change(screen.getByPlaceholderText(/Folder name/i), { target: { value: 'Another Folder' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
        });

        expect(createFolder).toHaveBeenCalledWith('Another Folder', 0);
        await waitFor(() => expect(screen.getByText(/Another Folder/i)).toBeTruthy());
    });

    it('loads and displays existing folders on mount', async () => {
        getFolders.mockResolvedValue([
            { id: 1, name: 'Existing Folder' },
        ]);
        await act(async () => { render(<Sidebar />); });
        await waitFor(() => expect(screen.getByText(/Existing Folder/i)).toBeTruthy());
    });
});

// ─── buildTree defensive behavior (tested via component rendering) ──────────

describe('Sidebar — buildTree defensive guards', () => {
    beforeEach(() => {
        getFolders.mockResolvedValue([]);
        createFolder.mockReset();
    });

    it('does not crash when getFolders returns an empty array', async () => {
        // Arrange
        getFolders.mockResolvedValue([]);

        // Act + Assert — no throw
        await act(async () => { render(<Sidebar />); });
        expect(screen.getByText(/Inbox \(Root\)/i)).toBeTruthy();
    });

    it('filters out items missing an id field', async () => {
        // Arrange — one valid folder, one without id
        getFolders.mockResolvedValue([
            { name: 'No ID Folder' },           // missing id — should be filtered
            { id: 2, name: 'Valid Folder' },
        ]);

        // Act
        await act(async () => { render(<Sidebar />); });
        await waitFor(() => expect(screen.getByText(/Valid Folder/i)).toBeTruthy());

        // Assert — the nameless folder doesn't crash the app; inbox still renders
        expect(screen.getByText(/Inbox \(Root\)/i)).toBeTruthy();
    });

    it('nests a child folder under its parent in the tree', async () => {
        // Arrange — parent + child with correct parent ref
        getFolders.mockResolvedValue([
            { id: 1, name: 'Parent Folder', parent: 0 },
            { id: 2, name: 'Child Folder', parent: 1 },
        ]);

        // Act
        await act(async () => { render(<Sidebar />); });

        // Assert — both folders appear
        await waitFor(() => {
            expect(screen.getByText(/Parent Folder/i)).toBeTruthy();
            expect(screen.getByText(/Child Folder/i)).toBeTruthy();
        });
    });

    it('does not render a child folder when its parent id is unknown', async () => {
        // Arrange — child references a non-existent parent (99)
        getFolders.mockResolvedValue([
            { id: 1, name: 'Root Folder', parent: 0 },
            { id: 2, name: 'Orphan Folder', parent: 99 },
        ]);

        // Act
        await act(async () => { render(<Sidebar />); });
        await waitFor(() => expect(screen.getByText(/Root Folder/i)).toBeTruthy());

        // Assert — orphan does not appear under the root tree
        expect(screen.queryByText(/Orphan Folder/i)).toBeFalsy();
    });
});

// ─── Collapse / expand behavior ─────────────────────────────────────────────

describe('Sidebar — collapse/expand', () => {
    beforeEach(() => {
        createFolder.mockReset();
    });

    it('shows both parent and child folders by default (all expanded)', async () => {
        // Arrange
        getFolders.mockResolvedValue([
            { id: 1, name: 'Parent', parent: 0 },
            { id: 2, name: 'Child', parent: 1 },
        ]);

        // Act
        await act(async () => { render(<Sidebar />); });

        // Assert — child is visible without any interaction
        await waitFor(() => {
            expect(screen.getByText(/Parent/i)).toBeTruthy();
            expect(screen.getByText(/Child/i)).toBeTruthy();
        });
    });

    it('hides children when the chevron is clicked (collapse)', async () => {
        // Arrange
        getFolders.mockResolvedValue([
            { id: 1, name: 'Parent', parent: 0 },
            { id: 2, name: 'Child', parent: 1 },
        ]);

        await act(async () => { render(<Sidebar />); });
        await waitFor(() => expect(screen.getByText(/Child/i)).toBeTruthy());

        // Act — click the chevron (▶ character)
        const chevron = screen.getByText('▶');
        await act(async () => { fireEvent.click(chevron); });

        // Assert — child is now hidden
        expect(screen.queryByText(/Child/i)).toBeFalsy();
    });

    it('shows children again after clicking the chevron twice (expand)', async () => {
        // Arrange
        getFolders.mockResolvedValue([
            { id: 1, name: 'Parent', parent: 0 },
            { id: 2, name: 'Child', parent: 1 },
        ]);

        await act(async () => { render(<Sidebar />); });
        await waitFor(() => expect(screen.getByText(/Child/i)).toBeTruthy());

        const chevron = screen.getByText('▶');

        // Collapse
        await act(async () => { fireEvent.click(chevron); });
        expect(screen.queryByText(/Child/i)).toBeFalsy();

        // Expand
        await act(async () => { fireEvent.click(chevron); });
        expect(screen.getByText(/Child/i)).toBeTruthy();
    });

    it('auto-expands parent when a sub-folder is created under it', async () => {
        // Arrange — parent folder selected; collapse it first, then create child
        getFolders.mockResolvedValue([
            { id: 1, name: 'Parent', parent: 0 },
        ]);
        createFolder.mockResolvedValue({ id: 2, name: 'New Child', parent: 1 });

        const onSelectFolder = jest.fn();
        await act(async () => {
            render(<Sidebar selectedFolderId={1} onSelectFolder={onSelectFolder} />);
        });
        await waitFor(() => expect(screen.getByText(/Parent/i)).toBeTruthy());

        // Create a sub-folder under the selected parent (selectedFolderId=1)
        fireEvent.click(screen.getByRole('button', { name: /\+ New Folder/i }));
        fireEvent.change(screen.getByPlaceholderText(/Folder name/i), {
            target: { value: 'New Child' },
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
        });

        // Assert — new child is visible (parent auto-expanded)
        await waitFor(() => expect(screen.getByText(/New Child/i)).toBeTruthy());
    });
});

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

    it('renders drag handle only for the selected folder', async () => {
        getFolders.mockResolvedValue([
            { id: 1, name: 'FolderA', parent: 0, meta: { wpmf_folder_order: 0 } },
        ]);
        await act(async () => {
            render(<Sidebar selectedFolderId={1} onSelectFolder={jest.fn()} />);
        });
        await waitFor(() => expect(screen.getByText(/FolderA/i)).toBeTruthy());
        expect(screen.getByTitle(/Drag to reorder/i)).toBeTruthy();
    });
});
