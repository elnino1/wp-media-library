import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Sidebar from './Sidebar';

// Mock the API client so tests don't make real network calls
jest.mock('../api/client', () => ({
    getFolders: jest.fn().mockResolvedValue([]),
    createFolder: jest.fn(),
}));

import { getFolders, createFolder } from '../api/client';

describe('Sidebar Component', () => {
    beforeEach(() => {
        getFolders.mockResolvedValue([]);
        createFolder.mockReset();
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
