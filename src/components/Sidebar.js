import { useState, useEffect, useRef } from '@wordpress/element';
import { useDroppable, useDraggable, useDndMonitor } from '@dnd-kit/core';
import { getFolders, createFolder, deleteFolder, moveFolder } from '../api/client';

// A single droppable + draggable folder row
const FolderItem = ({
    folder, depth, isSelected, onSelect, hasChildren, isCollapsed, onToggle,
    onDeleteRequest, showConfirm, onConfirmDelete, onCancelDelete, deleting, deleteError,
    isDraggingAny,
}) => {
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: folder.id });
    const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
        id: folder.id,
        data: { type: 'folder', folderId: folder.id },
    });

    return (
        <>
            <li
                ref={setDropRef}
                style={{
                    padding: '6px 8px 6px ' + (12 + depth * 16) + 'px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    fontWeight: isSelected ? '600' : 'normal',
                    opacity: isDragging ? 0.4 : 1,
                    background: isOver && isDraggingAny
                        ? '#e8f4fb'
                        : isSelected
                        ? '#f0f6fc'
                        : 'transparent',
                    border: isOver && isDraggingAny ? '1px dashed #007cba' : '1px solid transparent',
                    transition: 'background 0.1s',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isSelected && (
                        <span
                            ref={setDragRef}
                            {...listeners}
                            {...attributes}
                            style={{ cursor: 'grab', color: '#bbb', fontSize: '14px', userSelect: 'none', lineHeight: 1 }}
                            title="Drag to reorder"
                        >
                            ⠿
                        </span>
                    )}
                    {!isSelected && <span style={{ display: 'inline-block', width: '16px' }} />}
                    {hasChildren ? (
                        <span
                            onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
                            style={{
                                cursor: 'pointer',
                                display: 'inline-block',
                                width: '16px',
                                textAlign: 'center',
                                fontSize: '10px',
                                userSelect: 'none',
                                transition: 'transform 0.15s',
                                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                            }}
                        >
                            &#9654;
                        </span>
                    ) : (
                        <span style={{ display: 'inline-block', width: '16px' }} />
                    )}
                    <span onClick={() => onSelect(folder.id)} style={{ flex: 1 }}>
                        📁 {folder.name}
                    </span>
                    {isSelected && (
                        <button
                            aria-label="Delete folder"
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(folder.id); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontSize: '14px',
                                lineHeight: 1,
                                color: '#a00',
                            }}
                        >
                            🗑
                        </button>
                    )}
                </span>
            </li>
            {showConfirm && (
                <li style={{
                    padding: '6px 8px 6px ' + (12 + depth * 16) + 'px',
                    background: '#fff8e5',
                    border: '1px solid #f0c040',
                    borderRadius: '3px',
                    fontSize: '12px',
                }}>
                    <p style={{ margin: '0 0 4px' }}>
                        Delete &ldquo;{folder.name}&rdquo;? Images and sub-folders will be moved to the parent.
                    </p>
                    {deleteError && (
                        <p style={{ margin: '0 0 6px', color: '#721c24', fontWeight: '600' }}>
                            {deleteError}
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button
                            onClick={onConfirmDelete}
                            disabled={deleting}
                            style={{ cursor: 'pointer' }}
                        >
                            Confirm
                        </button>
                        <button
                            onClick={onCancelDelete}
                            disabled={deleting}
                            style={{ cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </li>
            )}
        </>
    );
};

// Build a nested tree from a flat list (WP REST returns flat terms), sorted by wpmf_folder_order
const buildTree = (folders, parentId = 0) => {
    if (!Array.isArray(folders)) return [];
    return folders
        .filter((f) => f && typeof f.id !== 'undefined' && (f.parent || 0) === parentId)
        .sort((a, b) => (a.meta?.wpmf_folder_order ?? 0) - (b.meta?.wpmf_folder_order ?? 0))
        .map((f) => ({ ...f, children: buildTree(folders, f.id) }));
};

// Helper to check if a folder is a descendant of a given ancestor
const isDescendantOf = (folders, ancestorId, checkId) => {
    if (!checkId || checkId === 0) return false;
    const folder = folders.find((f) => f.id === checkId);
    if (!folder) return false;
    if ((folder.parent || 0) === ancestorId) return true;
    return isDescendantOf(folders, ancestorId, folder.parent || 0);
};

// A slim drop zone that appears between folder rows for sibling reordering
const GapZone = ({ id, isActive }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{
                height: isActive && isOver ? '16px' : '4px',
                background: isOver ? '#007cba' : 'transparent',
                borderRadius: '2px',
                margin: '1px 0',
                transition: 'height 0.1s, background 0.1s',
            }}
        />
    );
};

// Render the tree recursively with gap zones for drag-to-reorder
const FolderTree = ({
    nodes, depth = 0, selectedFolderId, onSelect, collapsedIds, onToggle,
    onDeleteRequest, confirmDeleteId, onConfirmDelete, onCancelDelete, deleting, deleteError,
    isDraggingAny, parentId = 0,
}) => (
    <>
        <GapZone id={`gap:${parentId}:0`} isActive={isDraggingAny} />
        {nodes.map((node, index) => {
            const isCollapsed = collapsedIds.has(node.id);
            return (
                <div key={node.id}>
                    <FolderItem
                        folder={node}
                        depth={depth}
                        isSelected={selectedFolderId === node.id}
                        onSelect={onSelect}
                        hasChildren={node.children.length > 0}
                        isCollapsed={isCollapsed}
                        onToggle={onToggle}
                        onDeleteRequest={onDeleteRequest}
                        showConfirm={confirmDeleteId === node.id}
                        onConfirmDelete={onConfirmDelete}
                        onCancelDelete={onCancelDelete}
                        deleting={deleting}
                        deleteError={confirmDeleteId === node.id ? deleteError : null}
                        isDraggingAny={isDraggingAny}
                    />
                    {node.children.length > 0 && !isCollapsed && (
                        <FolderTree
                            nodes={node.children}
                            depth={depth + 1}
                            selectedFolderId={selectedFolderId}
                            onSelect={onSelect}
                            collapsedIds={collapsedIds}
                            onToggle={onToggle}
                            onDeleteRequest={onDeleteRequest}
                            confirmDeleteId={confirmDeleteId}
                            onConfirmDelete={onConfirmDelete}
                            onCancelDelete={onCancelDelete}
                            deleting={deleting}
                            deleteError={deleteError}
                            isDraggingAny={isDraggingAny}
                            parentId={node.id}
                        />
                    )}
                    <GapZone id={`gap:${parentId}:${index + 1}`} isActive={isDraggingAny} />
                </div>
            );
        })}
    </>
);

const Sidebar = ({ selectedFolderId, onSelectFolder }) => {
    const [folders, setFolders] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);
    const [collapsedIds, setCollapsedIds] = useState(new Set());
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [isDraggingFolderId, setIsDraggingFolderId] = useState(null);
    const inputRef = useRef(null);
    const foldersRef = useRef(folders);
    useEffect(() => { foldersRef.current = folders; }, [folders]);

    // Root inbox drop target
    const { setNodeRef: setRootRef, isOver: isOverRoot } = useDroppable({ id: 0 });

    const toggleCollapse = (folderId) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    useEffect(() => {
        getFolders().then(setFolders).catch(() => {});
    }, []);

    useEffect(() => {
        if (isCreating && inputRef.current) inputRef.current.focus();
    }, [isCreating]);

    const handleCreate = async () => {
        const name = newFolderName.trim();
        if (!name) return;
        setCreating(true);
        try {
            // Pass the currently selected folder as parent (or 0 for root)
            const parentId = selectedFolderId || 0;
            const folder = await createFolder(name, parentId);
            setFolders((prev) => [...prev, folder]);
            // Auto-expand parent to reveal new child
            if (parentId !== 0) {
                setCollapsedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(parentId);
                    return next;
                });
            }
            setNewFolderName('');
            setIsCreating(false);
        } catch (err) {
            console.error('Failed to create folder:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        const idToDelete = confirmDeleteId;
        if (!idToDelete) return;
        setDeleting(true);
        try {
            setDeleteError(null);
            const result = await deleteFolder(idToDelete);
            const parentId = result?.parent_id ?? 0;
            setConfirmDeleteId(null);
            const updated = await getFolders();
            setFolders(updated);
            if (onSelectFolder && selectedFolderId === idToDelete) {
                onSelectFolder(parentId || null);
            }
        } catch (err) {
            console.error('Delete failed:', err);
            setDeleteError('Delete failed. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const handleFolderMove = async (draggedId, newParentId, siblingIds) => {
        try {
            await moveFolder(draggedId, newParentId, siblingIds);
            const updated = await getFolders();
            setFolders(updated);
        } catch (err) {
            console.error('Folder move failed:', err);
        }
    };

    useDndMonitor({
        onDragStart({ active }) {
            if (active.data?.current?.type === 'folder') {
                setIsDraggingFolderId(active.id);
            }
        },
        onDragEnd({ active, over }) {
            setIsDraggingFolderId(null);
            if (active.data?.current?.type !== 'folder') return;
            if (!over) return;

            const draggedId = active.id;
            let newParentId;
            let insertPosition;

            const overId = String(over.id);
            if (overId.startsWith('gap:')) {
                const parts = overId.split(':');
                newParentId = Number(parts[1]);
                insertPosition = Number(parts[2]);
            } else if (typeof over.id === 'number' && over.id !== draggedId) {
                newParentId = over.id;
                insertPosition = Infinity;
            } else {
                return;
            }

            if (newParentId === draggedId) return;
            if (isDescendantOf(foldersRef.current, draggedId, newParentId)) return;

            const siblings = foldersRef.current
                .filter((f) => (f.parent || 0) === newParentId && f.id !== draggedId)
                .sort((a, b) => (a.meta?.wpmf_folder_order ?? 0) - (b.meta?.wpmf_folder_order ?? 0));

            const siblingIds = siblings.map((s) => s.id);
            siblingIds.splice(Math.min(insertPosition, siblingIds.length), 0, draggedId);

            handleFolderMove(draggedId, newParentId, siblingIds);
        },
    });

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleCreate();
        if (e.key === 'Escape') { setIsCreating(false); setNewFolderName(''); }
    };

    const tree = buildTree(folders);

    return (
        <div className="wpmf-sidebar" style={{ width: '250px', borderRight: '1px solid #ddd', padding: '15px', background: '#fff', overflowY: 'auto' }}>
            <h2>Media Folders</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {/* Root / Inbox — also a drop target */}
                <li
                    ref={setRootRef}
                    onClick={() => onSelectFolder(null)}
                    style={{
                        padding: '8px',
                        cursor: 'pointer',
                        fontWeight: selectedFolderId === null ? '700' : 'bold',
                        borderRadius: '3px',
                        background: isOverRoot ? '#e8f4fb' : selectedFolderId === null ? '#f0f6fc' : 'transparent',
                        border: isOverRoot ? '1px dashed #007cba' : '1px solid transparent',
                    }}
                >
                    🗂️ Inbox (Root)
                </li>
            </ul>

            <FolderTree
                nodes={tree}
                selectedFolderId={selectedFolderId}
                onSelect={onSelectFolder}
                collapsedIds={collapsedIds}
                onToggle={toggleCollapse}
                onDeleteRequest={(id) => setConfirmDeleteId(id)}
                confirmDeleteId={confirmDeleteId}
                onConfirmDelete={handleDelete}
                onCancelDelete={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                deleting={deleting}
                deleteError={deleteError}
                isDraggingAny={!!isDraggingFolderId}
                parentId={0}
            />

            {/* New Folder form — creates under selected folder */}
            {isCreating ? (
                <div style={{ marginTop: '12px' }}>
                    {selectedFolderId && (
                        <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>
                            Sub-folder of selected
                        </p>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Folder name…"
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '6px 8px', border: '1px solid #007cba',
                            borderRadius: '3px', fontSize: '13px',
                        }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button
                            className="components-button is-primary"
                            style={{ flex: 1 }}
                            onClick={handleCreate}
                            disabled={creating || !newFolderName.trim()}
                        >
                            {creating ? 'Adding…' : 'Add'}
                        </button>
                        <button
                            className="components-button is-secondary"
                            style={{ flex: 1 }}
                            onClick={() => { setIsCreating(false); setNewFolderName(''); }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    className="components-button is-secondary"
                    style={{ marginTop: '16px', width: '100%' }}
                    onClick={() => setIsCreating(true)}
                >
                    + New Folder
                    {selectedFolderId ? ' (sub)' : ''}
                </button>
            )}
        </div>
    );
};

export default Sidebar;
