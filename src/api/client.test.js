import apiFetch from '@wordpress/api-fetch';
import { getItems } from './client';

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
