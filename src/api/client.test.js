import apiFetch from '@wordpress/api-fetch';
import { getItems, deleteFolder, moveFolder } from './client';

jest.mock('@wordpress/api-fetch', () => jest.fn());

describe('getItems — wpmf_folder query param mapping', () => {
    beforeEach(() => {
        apiFetch.mockResolvedValue([]);
    });

    afterEach(() => {
        apiFetch.mockReset();
    });

    it('sends wpmf_folder=inbox when folderId is null (inbox selection)', async () => {
        // Arrange
        const folderId = null;

        // Act
        await getItems(folderId);

        // Assert
        const { path } = apiFetch.mock.calls[0][0];
        expect(path).toContain('wpmf_folder=inbox');
    });

    it('sends wpmf_folder=inbox when folderId is 0 (falsy — treated as inbox)', async () => {
        // Arrange
        const folderId = 0;

        // Act
        await getItems(folderId);

        // Assert
        const { path } = apiFetch.mock.calls[0][0];
        expect(path).toContain('wpmf_folder=inbox');
    });

    it('sends wpmf_folder=5 when folderId is a positive folder ID', async () => {
        // Arrange
        const folderId = 5;

        // Act
        await getItems(folderId);

        // Assert
        const { path } = apiFetch.mock.calls[0][0];
        expect(path).toContain('wpmf_folder=5');
        expect(path).not.toContain('wpmf_folder=inbox');
    });
});

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
        apiFetch.mockResolvedValue({ term_id: 5, parent: 3 });
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
