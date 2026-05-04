import { useRef, useEffect } from '@wordpress/element';
import { useDraggable } from '@dnd-kit/core';

const MediaItem = ({ item, isSelected = false, onToggleSelect }) => {
    const wasDragged = useRef(false);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: { type: 'media', item },
    });

    // Mark that a drag occurred so the subsequent click does not toggle selection
    useEffect(() => {
        if (isDragging) {
            wasDragged.current = true;
        }
    }, [isDragging]);

    const isImage = item.media_type === 'image';
    const thumbnailUrl =
        item.media_details?.sizes?.thumbnail?.source_url ||
        item.media_details?.sizes?.medium?.source_url ||
        item.source_url;
    const title = item.title?.rendered || 'Item ' + item.id;

    const handleMouseDown = () => { wasDragged.current = false; };
    const handleClick = () => {
        if (wasDragged.current) return;
        onToggleSelect?.(item.id);
    };

    const style = {
        width: '150px',
        border: isSelected ? '2px solid #007cba' : '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'grab',
        boxShadow: isSelected
            ? '0 0 0 3px rgba(0,124,186,0.18)'
            : '0 1px 3px rgba(0,0,0,0.06)',
        opacity: isDragging ? 0 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            className={'wpmf-media-item' + (isSelected ? ' wpmf-item--selected' : '')}
            style={style}
            title={title}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            {...listeners}
            {...attributes}
        >
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

export default MediaItem;
