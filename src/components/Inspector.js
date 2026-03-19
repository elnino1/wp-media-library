import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

// Parses "tag one, tag two" into ["tag one", "tag two"]
const parseNames = (input) =>
    input
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const Inspector = ({ folderId }) => {
    // comma-separated names the user is typing
    const [tagInput, setTagInput] = useState('');
    const [catInput, setCatInput] = useState('');
    // { name: { id, type } } — known WP terms
    const [termCache, setTermCache] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    // Load all existing WP tags + categories into termCache
    useEffect(() => {
        Promise.all([
            apiFetch({ path: '/wp/v2/tags?per_page=100' }),
            apiFetch({ path: '/wp/v2/categories?per_page=100' }),
        ])
            .then(([tags, cats]) => {
                const cache = {};
                tags.forEach((t) => { cache[t.name] = { id: t.id, type: 'tag' }; });
                cats.forEach((c) => { cache[c.name] = { id: c.id, type: 'category' }; });
                setTermCache(cache);
            })
            .catch(() => {});
    }, []);

    // Load existing folder mappings when folder changes
    useEffect(() => {
        if (!folderId) {
            setTagInput('');
            setCatInput('');
            setSaveStatus('');
            return;
        }
        apiFetch({ path: `/wp/v2/wpmf_folders/${folderId}` })
            .then((folder) => {
                const meta = folder.meta || {};
                const tagIds = meta.wpmf_mapped_post_tags || [];
                const catIds = meta.wpmf_mapped_product_cats || [];
                // Reverse-lookup: IDs → names via termCache
                const cacheById = {};
                Object.entries(termCache).forEach(([name, entry]) => {
                    cacheById[entry.id] = name;
                });
                setTagInput(tagIds.map((id) => cacheById[id] || id).join(', '));
                setCatInput(catIds.map((id) => cacheById[id] || id).join(', '));
                setSaveStatus('');
            })
            .catch(() => {});
    }, [folderId, termCache]);

    if (!folderId) {
        return (
            <div className="wpmf-inspector" style={{ width: '260px', borderLeft: '1px solid #ddd', padding: '15px', background: '#fff', overflowY: 'auto' }}>
                <h3 style={{ marginTop: 0 }}>Inspector</h3>
                <p style={{ color: '#888', fontSize: '13px' }}>Select a folder to configure its tag mappings.</p>
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const tagNames = parseNames(tagInput);
            const catNames = parseNames(catInput);

            // Detect names not yet in termCache
            const newTagNames = tagNames.filter((name) => !termCache[name]);
            const newCatNames = catNames.filter((name) => !termCache[name]);

            // Create new tags
            const tagCreations = newTagNames.map((name) =>
                apiFetch({ path: '/wp/v2/tags', method: 'POST', data: { name } })
            );
            // Create new categories
            const catCreations = newCatNames.map((name) =>
                apiFetch({ path: '/wp/v2/categories', method: 'POST', data: { name } })
            );

            // Wait for all creations — log failures, proceed with successes
            const results = await Promise.allSettled([...tagCreations, ...catCreations]);
            const updatedCache = { ...termCache };
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const term = result.value;
                    const type = index < tagCreations.length ? 'tag' : 'category';
                    updatedCache[term.name] = { id: term.id, type };
                } else {
                    console.error('Failed to create term:', result.reason);
                }
            });

            // Only update termCache when new entries were added — avoids
            // re-triggering useEffect([folderId, termCache]) which clears saveStatus.
            const newEntries = results.filter(r => r.status === 'fulfilled');
            if (newEntries.length > 0) {
                setTermCache(updatedCache);
            }

            const tagIds = tagNames.map((name) => updatedCache[name]?.id).filter(Boolean);
            const catIds = catNames.map((name) => updatedCache[name]?.id).filter(Boolean);

            await apiFetch({
                path: `/wp/v2/wpmf_folders/${folderId}`,
                method: 'POST',
                data: {
                    meta: {
                        wpmf_mapped_post_tags: tagIds,
                        wpmf_mapped_product_cats: catIds,
                    },
                },
            });

            setSaveStatus('Saved!');
        } catch (err) {
            console.error('Failed to save folder mappings:', err);
            setSaveStatus('Save failed.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="wpmf-inspector" style={{ width: '260px', borderLeft: '1px solid #ddd', padding: '15px', background: '#fff', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Inspector</h3>
            <p style={{ fontSize: '12px', color: '#666', marginTop: 0 }}>Folder #{folderId}</p>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}>
                    Mapped Post Tags
                </label>
                <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="comma-separated names"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px' }}
                />
                <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0' }}>New names are created automatically.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}>
                    Mapped WooCommerce Categories
                </label>
                <input
                    type="text"
                    value={catInput}
                    onChange={(e) => setCatInput(e.target.value)}
                    placeholder="comma-separated names"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px' }}
                />
                <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0' }}>New names are created automatically.</p>
            </div>

            {saveStatus && (
                <p style={{ color: saveStatus === 'Saved!' ? '#46b450' : '#dc3232', fontSize: '13px', margin: '0 0 12px' }}>
                    {saveStatus}
                </p>
            )}

            <button
                className="components-button is-primary"
                style={{ width: '100%' }}
                onClick={handleSave}
                disabled={isSaving}
            >
                {isSaving ? 'Saving…' : 'Save Mappings'}
            </button>
        </div>
    );
};

export default Inspector;
