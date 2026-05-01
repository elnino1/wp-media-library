import { render, screen, act } from '@testing-library/react';
import Grid from './Grid';

jest.mock('../api/client', () => ({
    getItems: jest.fn(),
}));

import { getItems } from '../api/client';

describe('Grid — empty state messages', () => {
    afterEach(() => {
        getItems.mockReset();
    });

    it('shows inbox empty state when selectedFolderId is null and no items returned', async () => {
        // Arrange — no items, inbox selected
        getItems.mockResolvedValue([]);

        // Act
        await act(async () => {
            render(<Grid selectedFolderId={null} refreshKey={0} onRefresh={() => {}} />);
        });

        // Assert
        expect(
            screen.getByText(/No unassigned media\. All items are organized into folders\./i)
        ).toBeTruthy();
    });

    it('shows folder empty state when selectedFolderId is a number and no items returned', async () => {
        // Arrange — no items, specific folder selected
        getItems.mockResolvedValue([]);

        // Act
        await act(async () => {
            render(<Grid selectedFolderId={7} refreshKey={0} onRefresh={() => {}} />);
        });

        // Assert
        expect(
            screen.getByText(/This folder is empty\. Drag media here to organize it\./i)
        ).toBeTruthy();
    });

    it('does not show empty state when items are present', async () => {
        // Arrange — one item returned
        getItems.mockResolvedValue([
            { id: 1, media_type: 'image', title: { rendered: 'Photo' }, media_details: {}, source_url: '' },
        ]);

        // Act
        await act(async () => {
            render(<Grid selectedFolderId={null} refreshKey={0} onRefresh={() => {}} />);
        });

        // Assert
        expect(screen.queryByText(/No unassigned media/i)).toBeFalsy();
        expect(screen.queryByText(/This folder is empty/i)).toBeFalsy();
    });
});
