---
plan: 02-01
status: complete
phase: "02"
---

# Summary: Auto-creation logic in handleSave

## What shipped

`handleSave` in `src/components/Inspector.js` is now async and auto-creates WordPress tags and categories via `Promise.allSettled` before saving folder term mappings.

- New terms detected by absence from `termCache`
- Tags created via `POST /wp/v2/tags`, categories via `POST /wp/v2/categories`
- Individual creation failures logged via `console.error` — save always proceeds with whatever IDs were successfully obtained
- `setTermCache` updated before ID lookup to include newly created terms
- `isSaving` gates the entire sequence

## Requirement satisfied

LOGIC-04 — fulfilled.
