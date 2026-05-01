import { useState, useEffect, useRef } from '@wordpress/element';
import { useDroppable } from '@dnd-kit/core';
import { getFolders, createFolder } from '../api/client';

// A single droppable folder row
const FolderItem = ({ folder, depth, isSelected, onSelect, hasChildren, isCollapsed, onToggle }) => {
    const { setNodeRef, isOver } = useDroppable({ id: folder.id });

    return (
        <li
            ref={setNodeRef}
            style={{
                padding: '6px 8px 6px ' + (12 + depth * 16) + 'px',
                cursor: 'pointer',
                borderRadius: '3px',
                fontWeight: isSelected ? '600' : 'normal',
                background: isOver
                    ? '#e8f4fb'
                    : isSelected
                    ? '#f0f6fc'
                    : 'transparent',
                border: isOver ? '1px dashed #007cba' : '1px solid transparent',
                transition: 'background 0.1s',
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            </span>
        </li>
    );
};

// Build a nested tree from a flat list (WP REST returns flat terms)
const buildTree = (folders, parentId = 0) => {
    if (!Array.isArray(folders)) return [];
    return folders
        .filter((f) => f && typeof f.id !== 'undefined' && (f.parent || 0) === parentId)
        .map((f) => ({ ...f, children: buildTree(folders, f.id) }));
};

// Render the tree recursively
const FolderTree = ({ nodes, depth = 0, selectedFolderId, onSelect, collapsedIds, onToggle }) =>
    nodes.map((node) => {
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
                />
                {node.children.length > 0 && !isCollapsed && (
                    <FolderTree
                        nodes={node.children}
                        depth={depth + 1}
                        selectedFolderId={selectedFolderId}
                        onSelect={onSelect}
                        collapsedIds={collapsedIds}
                        onToggle={onToggle}
                    />
                )}
            </div>
        );
    });

const Sidebar = ({ selectedFolderId, onSelectFolder }) => {
    const [folders, setFolders] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);
    const [collapsedIds, setCollapsedIds] = useState(new Set());
    const inputRef = useRef(null);

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
