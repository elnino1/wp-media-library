import { useState, useEffect } from '@wordpress/element';
import { useDraggable } from '@dnd-kit/core';
import { getItems } from '../api/client';

// A single draggable media card
const MediaItem = ({ item }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
    });

    const isImage = item.media_type === 'image';
    const thumbnailUrl =
        item.media_details?.sizes?.thumbnail?.source_url ||
        item.media_details?.sizes?.medium?.source_url ||
        item.source_url;
    const title = item.title?.rendered || 'Item ' + item.id;

    const style = {
        width: '150px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isDragging
            ? '0 8px 24px rgba(0,0,0,0.18)'
            : '0 1px 3px rgba(0,0,0,0.06)',
        opacity: isDragging ? 0.75 : 1,
        transform: transform
            ? `translate(${transform.x}px, ${transform.y}px)`
            : undefined,
        zIndex: isDragging ? 999 : undefined,
        position: isDragging ? 'relative' : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} title={title} {...listeners} {...attributes}>
            {/* Thumbnail area */}
            <div style={{
                width: '100%',
                height: '110px',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                {isImage && thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        draggable={false}
                    />
                ) : (
                    <span style={{ fontSize: '36px' }}>
                        {item.media_type === 'video' ? '🎬' : '📄'}
                    </span>
                )}
            </div>

            {/* Filename label */}
            <div style={{
                padding: '6px 8px',
                fontSize: '11px',
                color: '#444',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderTop: '1px solid #eee',
                background: '#fafafa',
            }}>
                {title}
            </div>
        </div>
    );
};

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

const Grid = ({ selectedFolderId, refreshKey, onRefresh }) => {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Reset pagination when folder or refreshKey changes
    useEffect(() => {
        setItems([]);
        setPage(1);
        setHasMore(true);
    }, [selectedFolderId, refreshKey]);

    const loadItems = async (pageNumber) => {
        setLoading(true);
        const newItems = await getItems(selectedFolderId || 0, pageNumber);
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
                    <MediaItem key={item.id} item={item} />
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
                <p style={{ color: '#888', marginTop: '20px' }}>No items in this folder. Drag media here or upload.</p>
            )}

            {!hasMore && items.length > 0 && (
                <p style={{ marginTop: '20px', color: '#666' }}>All items loaded.</p>
            )}
        </div>
    );
};

export default Grid;
