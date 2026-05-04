import { render, screen, fireEvent, act } from '@testing-library/react';
import MediaItem from './MediaItem';

jest.mock('@dnd-kit/core', () => ({
    useDraggable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: () => {},
        isDragging: false,
    }),
}));

const makeItem = (overrides = {}) => ({
    id: 1,
    media_type: 'image',
    title: { rendered: 'Test Image' },
    media_details: {},
    source_url: 'https://example.com/image.jpg',
    ...overrides,
});

describe('MediaItem — selection', () => {
    it('calls onToggleSelect with item id on click', () => {
        const onToggleSelect = jest.fn();
        render(<MediaItem item={makeItem()} isSelected={false} onToggleSelect={onToggleSelect} />);

        fireEvent.click(screen.getByTitle('Test Image'));

        expect(onToggleSelect).toHaveBeenCalledWith(1);
    });

    it('calls onToggleSelect again on second click (deselect)', () => {
        const onToggleSelect = jest.fn();
        const { rerender } = render(
            <MediaItem item={makeItem()} isSelected={false} onToggleSelect={onToggleSelect} />
        );
        fireEvent.click(screen.getByTitle('Test Image'));
        rerender(<MediaItem item={makeItem()} isSelected={true} onToggleSelect={onToggleSelect} />);
        fireEvent.click(screen.getByTitle('Test Image'));

        expect(onToggleSelect).toHaveBeenCalledTimes(2);
        expect(onToggleSelect).toHaveBeenNthCalledWith(1, 1);
        expect(onToggleSelect).toHaveBeenNthCalledWith(2, 1);
    });

    it('applies selected class and border when isSelected=true', () => {
        render(<MediaItem item={makeItem()} isSelected={true} onToggleSelect={() => {}} />);
        const card = screen.getByTitle('Test Image');
        expect(card.className).toContain('wpmf-item--selected');
    });

    it('does not apply selected class when isSelected=false', () => {
        render(<MediaItem item={makeItem()} isSelected={false} onToggleSelect={() => {}} />);
        const card = screen.getByTitle('Test Image');
        expect(card.className).not.toContain('wpmf-item--selected');
    });

    it('does not call onToggleSelect when onToggleSelect is not provided', () => {
        render(<MediaItem item={makeItem()} />);
        expect(() => fireEvent.click(screen.getByTitle('Test Image'))).not.toThrow();
    });
});

describe('MediaItem — rendering', () => {
    it('renders an img tag for image items with a source_url', () => {
        render(<MediaItem item={makeItem()} />);
        const img = screen.getByRole('img');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src')).toBe('https://example.com/image.jpg');
    });

    it('renders a video emoji for video items', () => {
        render(<MediaItem item={makeItem({ id: 2, media_type: 'video', title: { rendered: 'My Video' } })} />);
        expect(screen.getByTitle('My Video').textContent).toContain('🎬');
    });

    it('renders a file emoji for non-image, non-video items', () => {
        render(<MediaItem item={makeItem({ id: 3, media_type: 'application', title: { rendered: 'Doc' } })} />);
        expect(screen.getByTitle('Doc').textContent).toContain('📄');
    });
});
