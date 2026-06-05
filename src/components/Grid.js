import { useState, useEffect, useCallback } from '@wordpress/element';
import { getItems } from '../api/client';
import MediaItem from './MediaItem';

// Opens the native WordPress media uploader
const openWpMediaUploader = (onUploaded) => {
    if (!window.wp || !window.wp.media) {
        console.warn('wp.media not available');
        return;
    }
    const frame = window.wp.media({
        title: 'Upload or select media',
        button: { text: 'Use this media' },
        multiple: true,
    });
    frame.on('select', () => {
        onUploaded(); // refresh grid after selection/upload
    });
    frame.open();
};

const Grid = ({ selectedFolderId, refreshKey, onRefresh, selectedItemIds = new Set(), onToggleSelect, onSelectRange }) => {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [anchorItemId, setAnchorItemId] = useState(null);

    // Reset pagination and selection anchor when folder or refreshKey changes
    useEffect(() => {
        setItems([]);
        setPage(1);
        setHasMore(true);
        setAnchorItemId(null);
    }, [selectedFolderId, refreshKey]);

    const loadItems = async (pageNumber) => {
        setLoading(true);
        const newItems = await getItems(selectedFolderId, pageNumber);
        if (newItems.length === 0) {
            setHasMore(false);
        } else {
            setItems((prev) => (pageNumber === 1 ? newItems : [...prev, ...newItems]));
        }
        setLoading(false);
    };

    useEffect(() => {
        loadItems(page);
    }, [page, selectedFolderId, refreshKey]);

    const handleItemClick = useCallback((id, shiftKey) => {
        if (shiftKey && anchorItemId && onSelectRange) {
            const anchorIndex = items.findIndex((i) => i.id === anchorItemId);
            const targetIndex = items.findIndex((i) => i.id === id);
            if (anchorIndex !== -1 && targetIndex !== -1) {
                const start = Math.min(anchorIndex, targetIndex);
                const end = Math.max(anchorIndex, targetIndex);
                onSelectRange(items.slice(start, end + 1).map((i) => i.id));
                return;
            }
        }
        setAnchorItemId(id);
        onToggleSelect?.(id);
    }, [items, anchorItemId, onToggleSelect, onSelectRange]);

    const folderLabel = selectedFolderId ? `Folder #${selectedFolderId}` : 'Inbox (Root)';

    return (
        <div className="wpmf-grid" style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
            <div className="wpmf-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{folderLabel}</h2>
                <div className="toolbar-actions">
                    <button
                        className="components-button is-primary"
                        onClick={() => openWpMediaUploader(onRefresh)}
                    >
                        Upload Item
                    </button>
                </div>
            </div>

            <div className="grid-items" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {items.map((item) => (
                    <MediaItem
                        key={item.id}
                        item={item}
                        isSelected={selectedItemIds.has(item.id)}
                        onToggleSelect={handleItemClick}
                    />
                ))}
            </div>

            {loading && <p style={{ marginTop: '20px' }}>Loading items...</p>}

            {!loading && hasMore && items.length > 0 && (
                <button
                    className="components-button is-secondary"
                    style={{ marginTop: '20px' }}
                    onClick={() => setPage(page + 1)}
                >
                    Load More Items
                </button>
            )}

            {!loading && !hasMore && items.length === 0 && (
                <p style={{ color: '#888', marginTop: '20px' }}>
                    {selectedFolderId === null
                        ? 'No unassigned media. All items are organized into folders.'
                        : 'This folder is empty. Drag media here to organize it.'}
                </p>
            )}

            {!hasMore && items.length > 0 && (
                <p style={{ marginTop: '20px', color: '#666' }}>All items loaded.</p>
            )}
        </div>
    );
};

export default Grid;
