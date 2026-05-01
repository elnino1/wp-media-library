# Conventional Commits Versioning — Design Spec

**Date:** 2026-05-01
**Status:** Approved

## Goal

Automate version bumps and GitHub releases for the `wp-media-folders` plugin based on conventional commit messages, using a PR-based release model (release-please).

## Approach

**release-please (PR-based).** Conventional commits accumulate in an auto-generated Release PR. The developer controls when to ship by merging that PR. On merge, release-please creates the GitHub release and tag; a second workflow job builds and uploads `wp-media-folders.zip`.

## New Files

### `release-please-config.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "simple",
  "packages": {
    ".": {
      "changelog-path": "CHANGELOG.md",
      "extra-files": [
        { "type": "generic", "path": "wp-media-folders.php" }
      ]
    }
  }
}
```

The `generic` updater scans `wp-media-folders.php` for the current version string and replaces all occurrences — covering both the plugin header (`Version: 1.0.0`) and the PHP constant (`define('WPMF_VERSION', '1.0.0')`).

### `.release-please-manifest.json`

```json
{ ".": "1.0.0" }
```

Tracks the current released version. release-please updates this on each release.

## Updated Workflow: `release.yml`

Two jobs replace the current single job.

### Job 1 — `release-please`

- Triggers on every push to `main` (no `paths-ignore`)
- Calls `googleapis/release-please-action@v4`
- Creates or updates the Release PR when unreleased conventional commits exist
- Outputs `release_created` and `tag_name` when a Release PR merge is detected

Permissions required: `contents: write`, `pull-requests: write`

### Job 2 — `build-and-upload`

- Depends on job 1; runs only when `release_created == true`
- Checks out the repo at the new tag
- Runs `npm ci && npm run package`
- Uploads `wp-media-folders.zip` to the GitHub release via `gh release upload`

## Version Bump Rules

| Commit type | Bump |
|---|---|
| `fix:` | patch — `1.0.0 → 1.0.1` |
| `feat:` | minor — `1.0.0 → 1.1.0` |
| `feat!:` or `BREAKING CHANGE:` in footer | major — `1.0.0 → 2.0.0` |
| `chore:`, `docs:`, `refactor:`, `ci:`, `test:` | no release |

## Day-to-Day Flow

1. Push conventional commits to `main` as normal
2. release-please opens/updates a Release PR (e.g. `chore(main): release 1.1.0`) that bumps `wp-media-folders.php`, `.release-please-manifest.json`, and `CHANGELOG.md`
3. When ready to ship, merge the Release PR
4. release-please creates the GitHub release and tag; the build job uploads `wp-media-folders.zip` automatically

## Files Changed

| File | Action |
|---|---|
| `release-please-config.json` | Create |
| `.release-please-manifest.json` | Create |
| `.github/workflows/release.yml` | Rewrite |
