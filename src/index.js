import { render, useState, useCallback } from '@wordpress/element';
import Sidebar from './components/Sidebar';
import Grid from './components/Grid';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { moveItems } from './api/client';

import './style.scss';

const App = () => {
    // Which folder is currently selected in the sidebar (null = Root/Inbox)
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    // Increment this to force the Grid to reload
    const [gridRefreshKey, setGridRefreshKey] = useState(0);

    const refreshGrid = useCallback(() => setGridRefreshKey((k) => k + 1), []);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 8 }, // avoid accidental drags on click
    }));

    const handleDragEnd = async ({ active, over }) => {
        // `active.id` is the media item ID; `over.id` is the folder ID (or null)
        if (!over || active.id === over.id) return;
        try {
            await moveItems([active.id], over.id);
            refreshGrid(); // reload grid to reflect the move
        } catch (err) {
            console.error('Move failed:', err);
        }
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="wpmf-app-container" style={{ display: 'flex', height: 'calc(100vh - 32px)', marginTop: '10px' }}>
                <Sidebar
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                />
                <Grid
                    selectedFolderId={selectedFolderId}
                    refreshKey={gridRefreshKey}
                    onRefresh={refreshGrid}
                />
            </div>
        </DndContext>
    );
};

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('wpmf-app-root');
    if (root) {
        render(<App />, root);
    }
});
