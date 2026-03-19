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

jest.mock('./components/Grid', () => ({
    __esModule: true,
    default: ({ selectedFolderId, refreshKey }) => (
        <div
            data-testid="grid"
            data-selected={selectedFolderId}
            data-refresh={refreshKey}
        >
            Grid
        </div>
    ),
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

jest.mock('@dnd-kit/core', () => ({
    DndContext: ({ children, onDragEnd }) => {
        capturedOnDragEnd = onDragEnd;
        return <div data-testid="dnd-context">{children}</div>;
    },
    useSensors: (...sensors) => sensors,
    useSensor: (sensor, opts) => ({ sensor, opts }),
    PointerSensor: 'PointerSensor',
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    capturedOnDragEnd = null;
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
