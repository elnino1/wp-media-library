import { render, useState, useCallback, useEffect } from '@wordpress/element';
import Sidebar from './components/Sidebar';
import Grid from './components/Grid';
import Inspector from './components/Inspector';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { moveItems } from './api/client';

import './style.scss';

const MediaCardOverlay = ({ item }) => {
    const isImage = item.media_type === 'image';
    const thumbnailUrl =
        item.media_details?.sizes?.thumbnail?.source_url ||
        item.media_details?.sizes?.medium?.source_url ||
        item.source_url;
    const title = item.title?.rendered || 'Item ' + item.id;

    return (
        <div style={{
            width: '150px',
            border: '2px solid #007cba',
            borderRadius: '4px',
            overflow: 'hidden',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            opacity: 0.92,
            cursor: 'grabbing',
        }}>
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

export const App = () => {
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [gridRefreshKey, setGridRefreshKey] = useState(0);
    const [activeItem, setActiveItem] = useState(null);
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());

    const refreshGrid = useCallback(() => setGridRefreshKey((k) => k + 1), []);

    const toggleSelectItem = useCallback((id) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedItemIds(new Set()), []);

    // Clear selection when the user switches folders
    useEffect(() => {
        clearSelection();
    }, [selectedFolderId]);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 8 },
    }));

    const handleDragStart = ({ active }) => {
        if (active.data?.current?.type === 'media') {
            setActiveItem(active.data.current.item);
        }
    };

    const handleDragEnd = async ({ active, over }) => {
        setActiveItem(null);
        // Folder drags are handled by Sidebar's useDndMonitor
        if (active.data?.current?.type === 'folder') return;
        // Gap zone drop targets have string IDs — skip for media drops
        if (!over || typeof over.id !== 'number') return;
        if (active.id === over.id) return;
        try {
            const idsToMove = selectedItemIds.has(active.id)
                ? [...selectedItemIds]
                : [active.id];
            await moveItems(idsToMove, over.id);
            clearSelection();
            refreshGrid();
        } catch (err) {
            console.error('Move failed:', err);
        }
    };

    const handleDragCancel = () => setActiveItem(null);

    const isDraggingSelected = activeItem && selectedItemIds.has(activeItem.id);

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <div className="wpmf-app-container" style={{ display: 'flex', height: 'calc(100vh - 32px)', marginTop: '10px' }}>
                <Sidebar
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                />
                <Grid
                    selectedFolderId={selectedFolderId}
                    refreshKey={gridRefreshKey}
                    onRefresh={refreshGrid}
                    selectedItemIds={selectedItemIds}
                    onToggleSelect={toggleSelectItem}
                />
                <Inspector folderId={selectedFolderId} />
            </div>
            <DragOverlay>
                {activeItem ? (
                    isDraggingSelected && selectedItemIds.size > 1
                        ? (
                            <div className="wpmf-drag-badge">
                                {selectedItemIds.size} items
                            </div>
                        )
                        : <MediaCardOverlay item={activeItem} />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('wpmf-app-root');
    if (root) {
        render(<App />, root);
    }
});
