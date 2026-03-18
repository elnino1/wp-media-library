import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

export const getFolders = async () => {
    return await apiFetch({ path: '/wp/v2/wpmf_folders' });
};

export const createFolder = async (name, parentId = 0) => {
    return await apiFetch({ 
        path: '/wp/v2/wpmf_folders', 
        method: 'POST',
        data: { name, parent: parentId }
    });
};

export const getItems = async (folderId = 0, page = 1, perPage = 20) => {
    // Queries media items with simple pagination parameters
    const queryArgs = {
        per_page: perPage,
        page: page,
    };
    
    // In the future this will be merged cleanly internally for WooCommerce support
    const path = addQueryArgs('/wp/v2/media', queryArgs);
    
    try {
        const response = await apiFetch({ path });
        return response || [];
    } catch (error) {
        console.error('Error fetching items:', error);
        return [];
    }
};

export const moveItems = async (itemIds, folderId) => {
    return await apiFetch({
        path: '/wpmf/v1/move',
        method: 'POST',
        data: { item_ids: itemIds, folder_id: folderId }
    });
};
