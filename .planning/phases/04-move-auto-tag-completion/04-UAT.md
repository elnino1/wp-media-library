---
status: testing
phase: 04-move-auto-tag-completion
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md]
started: 2026-03-19T22:35:00Z
updated: 2026-03-19T22:35:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Tag-on-move — item receives folder's mapped tags
expected: |
  Move a media item onto a folder that has tag mappings configured (wpmf_mapped_post_tags set). After the move, check the item's post_tag taxonomy (via wp admin > Media > edit item, or WP-CLI: `wp term list post_tag --object_ids=<item_id>`). The item should now have exactly the tags defined in the folder's mappings, replacing any previous tags.
awaiting: user response

## Tests

### 1. Tag-on-move — item receives folder's mapped tags
expected: Move a media item onto a folder that has tag mappings configured (wpmf_mapped_post_tags set). After the move, check the item's post_tag taxonomy (via wp admin > Media > edit item, or WP-CLI: `wp term list post_tag --object_ids=<item_id>`). The item should now have exactly the tags defined in the folder's mappings, replacing any previous tags.
result: [pending]

### 2. Inbox move skips tag mapper — existing tags preserved
expected: Move a media item from a folder back to inbox (folder_id=0 / drag onto the root "Inbox" folder or equivalent). After the move, the item's tags should be unchanged — the tag mapper is NOT called for inbox moves. Verify via wp admin or WP-CLI that the item still has its previous tags.
result: [pending]

### 3. Upload button opens WP media modal
expected: Start wp-env. Open the plugin's media library admin page. Click the "Upload Item" button (or similar upload UI element in the Grid toolbar). The native WordPress media uploader modal should open — the familiar multi-tab WP media frame. If it was broken before (TypeError: wp.media is not a function), it should now work because media-views is enqueued.
result: [pending]

### 4. "Saved!" message persists after saving existing-term mappings
expected: In the Inspector panel, select a folder that already has tag mappings saved. Click "Save Mappings" without changing anything (or type a tag name that already exists in WordPress). After saving, the "Saved!" confirmation message should remain visible — it should NOT flash and disappear instantly. Previously this was broken because the message was cleared by a re-triggered useEffect.
result: [pending]

### 5. Inspector loads existing mappings for selected folder
expected: Select a folder in the sidebar that has previously saved tag mappings. The Inspector panel's tag input field should be pre-populated with the names of the mapped tags. Selecting a different folder should load that folder's mappings. Selecting no folder (root) should show the placeholder "Select a folder to configure its tag mappings."
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0

## Gaps

[none yet]
