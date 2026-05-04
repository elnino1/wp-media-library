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

export const getItems = async (folderId = null, page = 1, perPage = 20) => {
    const queryArgs = {
        per_page: perPage,
        page: page,
        wpmf_folder: folderId ? folderId : 'inbox',
    };

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

export const deleteFolder = async (id) => {
    return await apiFetch({
        path: `/wpmf/v1/folder/${id}`,
        method: 'DELETE',
    });
};

export const moveFolder = async (id, parentId, siblingIds) => {
    return await apiFetch({
        path: `/wpmf/v1/folder/${id}/move`,
        method: 'POST',
        data: { parent_id: parentId, sibling_ids: siblingIds },
    });
};
