import { render, screen, act, waitFor } from '@testing-library/react';
import { App } from './index';

// ─── Mock child components ───────────────────────────────────────────────────
// Render minimal stubs that expose key props via data attributes for assertions

jest.mock('./components/Sidebar', () => ({
    __esModule: true,
    default: ({ selectedFolderId, onSelectFolder }) => (
        <div
            data-testid="sidebar"
            data-selected={selectedFolderId}
            onClick={() => onSelectFolder(7)}
        >
            Sidebar
        </div>
    ),
}));

let capturedOnToggleSelect = null;

jest.mock('./components/Grid', () => ({
    __esModule: true,
    default: ({ selectedFolderId, refreshKey, onToggleSelect }) => {
        capturedOnToggleSelect = onToggleSelect;
        return (
            <div
                data-testid="grid"
                data-selected={selectedFolderId}
                data-refresh={refreshKey}
            >
                Grid
            </div>
        );
    },
}));

jest.mock('./components/Inspector', () => ({
    __esModule: true,
    default: ({ folderId }) => (
        <div data-testid="inspector" data-folder={folderId}>
            {folderId == null
                ? 'Select a folder to configure its tag mappings.'
                : `Inspector for folder ${folderId}`}
        </div>
    ),
}));

// ─── Mock API client ─────────────────────────────────────────────────────────

jest.mock('./api/client', () => ({
    moveItems: jest.fn().mockResolvedValue({}),
    getFolders: jest.fn().mockResolvedValue([]),
    getItems: jest.fn().mockResolvedValue([]),
    createFolder: jest.fn(),
}));

import { moveItems } from './api/client';

// ─── Mock dnd-kit ─────────────────────────────────────────────────────────────
// Expose onDragEnd so tests can call it directly

let capturedOnDragEnd = null;
let capturedOnDragStart = null;

jest.mock('@dnd-kit/core', () => ({
    DndContext: ({ children, onDragEnd, onDragStart, onDragCancel }) => {
        capturedOnDragEnd = onDragEnd;
        capturedOnDragStart = onDragStart;
        return <div data-testid="dnd-context">{children}</div>;
    },
    DragOverlay: ({ children }) => (children ? <div data-testid="drag-overlay">{children}</div> : null),
    useSensors: (...sensors) => sensors,
    useSensor: (sensor, opts) => ({ sensor, opts }),
    PointerSensor: 'PointerSensor',
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    capturedOnDragEnd = null;
    capturedOnDragStart = null;
    capturedOnToggleSelect = null;
    moveItems.mockReset();
    moveItems.mockResolvedValue({});
});

describe('App — 3-column layout', () => {
    it('renders Sidebar, Grid, and Inspector on mount', async () => {
        // Act
        await act(async () => { render(<App />); });

        // Assert — all three columns present
        expect(screen.getByTestId('sidebar')).toBeTruthy();
        expect(screen.getByTestId('grid')).toBeTruthy();
        expect(screen.getByTestId('inspector')).toBeTruthy();
    });

    it('Inspector shows placeholder when no folder is selected (selectedFolderId=null)', async () => {
        // Act
        await act(async () => { render(<App />); });

        // Assert — Inspector receives null folderId initially
        expect(
            screen.getByText(/Select a folder to configure its tag mappings/i)
        ).toBeTruthy();
    });
});

describe('App — handleDragEnd guards', () => {
    it('does not call moveItems when there is no drop target (over=null)', async () => {
        // Arrange
        await act(async () => { render(<App />); });

        // Act — simulate drag with no target
        await act(async () => {
            capturedOnDragEnd({ active: { id: 10 }, over: null });
        });

        // Assert
        expect(moveItems).not.toHaveBeenCalled();
    });

    it('does not call moveItems when item is dropped on itself (active.id === over.id)', async () => {
        // Arrange
        await act(async () => { render(<App />); });

        // Act — same id for active and over
        await act(async () => {
            capturedOnDragEnd({ active: { id: 5 }, over: { id: 5 } });
        });

        // Assert
        expect(moveItems).not.toHaveBeenCalled();
    });
});

describe('App — handleDragEnd success', () => {
    it('calls moveItems([itemId], folderId) when a valid drag-drop occurs', async () => {
        // Arrange
        await act(async () => { render(<App />); });

        // Act — item 10 dropped onto folder 3
        await act(async () => {
            capturedOnDragEnd({ active: { id: 10 }, over: { id: 3 } });
        });

        // Assert
        await waitFor(() =>
            expect(moveItems).toHaveBeenCalledWith([10], 3)
        );
    });

    it('increments gridRefreshKey (Grid re-renders) after a successful move', async () => {
        // Arrange
        await act(async () => { render(<App />); });
        const gridBefore = screen.getByTestId('grid');
        const refreshBefore = Number(gridBefore.getAttribute('data-refresh'));

        // Act
        await act(async () => {
            capturedOnDragEnd({ active: { id: 10 }, over: { id: 3 } });
        });

        // Assert — refresh key incremented
        await waitFor(() => {
            const refreshAfter = Number(
                screen.getByTestId('grid').getAttribute('data-refresh')
            );
            expect(refreshAfter).toBe(refreshBefore + 1);
        });
    });
});

describe('App — batch move with selection', () => {
    it('moves all selected IDs when dragged item is in the selection', async () => {
        // Arrange — render and select items 10 and 20
        await act(async () => { render(<App />); });
        act(() => { capturedOnToggleSelect(10); });
        act(() => { capturedOnToggleSelect(20); });

        // Act — drag item 10 onto folder 5
        await act(async () => {
            capturedOnDragEnd({ active: { id: 10 }, over: { id: 5 } });
        });

        // Assert — all selected IDs moved together
        await waitFor(() => {
            const call = moveItems.mock.calls[0];
            expect(call[0].sort()).toEqual([10, 20]);
            expect(call[1]).toBe(5);
        });
    });

    it('moves only the dragged item when it is NOT in the selection', async () => {
        // Arrange — select item 20 only, drag item 10 (unselected)
        await act(async () => { render(<App />); });
        act(() => { capturedOnToggleSelect(20); });

        // Act — drag item 10 (not selected)
        await act(async () => {
            capturedOnDragEnd({ active: { id: 10 }, over: { id: 5 } });
        });

        // Assert — only item 10 moved (selection ignored)
        await waitFor(() =>
            expect(moveItems).toHaveBeenCalledWith([10], 5)
        );
    });
});
