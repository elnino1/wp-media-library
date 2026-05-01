# Conventional Commits Versioning — Design Spec

**Date:** 2026-05-01
**Status:** Approved

## Goal

Automate version bumps and GitHub releases for the `wp-media-folders` plugin based on conventional commit messages. Version is computed at release time — never committed to the repo.

## Approach

On every push to `main`, the workflow reads conventional commits since the last tag, computes a semver bump, injects the version into the source in memory, packages the plugin, and publishes a GitHub release. No Release PRs, no version config files.

## Source Change

`wp-media-folders.php` uses the literal string `VERSION` as a placeholder in both locations:

```php
 * Version:           VERSION
```

```php
define( 'WPMF_VERSION', 'VERSION' );
```

The working tree is patched via `sed` during the workflow before packaging. The placeholder is never replaced in the committed source.

## Workflow: `release.yml`

Single job, runs on every push to `main`.

### Steps

**1. Determine last version**
```bash
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
LAST_VERSION=${LAST_TAG#v}   # fallback: 1.0.0 if no tags exist
```

**2. Read commits since last tag and determine bump**

| Condition | Bump |
|---|---|
| Any commit matches `feat!:` or contains `BREAKING CHANGE:` | major |
| Any commit matches `feat:` | minor |
| Everything else (including `fix:`, `chore:`, `docs:`, `ci:`) | patch |

**3. Compute new version**
Split `LAST_VERSION` into `MAJOR.MINOR.PATCH`, apply bump, reset lower components (e.g. minor bump → `PATCH=0`).

**4. Inject version into source (no commit)**
```bash
sed -i "s/Version:           VERSION/Version:           $NEW_VERSION/" wp-media-folders.php
sed -i "s/define( 'WPMF_VERSION', 'VERSION' )/define( 'WPMF_VERSION', '$NEW_VERSION' )/" wp-media-folders.php
```

**5. Build and package**
```bash
npm ci
npm run package   # produces wp-media-folders.zip
```

**6. Tag and release**
```bash
git tag "v$NEW_VERSION"
git push origin "v$NEW_VERSION"
gh release create "v$NEW_VERSION" wp-media-folders.zip --generate-notes
```

### Permissions

`contents: write` (push tag, create release).

## Files Changed

| File | Action |
|---|---|
| `wp-media-folders.php` | Replace both version strings with `VERSION` placeholder |
| `.github/workflows/release.yml` | Rewrite with version-bump logic |
