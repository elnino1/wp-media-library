# Conventional Commits Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded version in `wp-media-folders.php` with a `VERSION` placeholder and rewrite `release.yml` to compute a semver bump from conventional commits on every push to `main`, inject the version, build, and publish a GitHub release.

**Architecture:** A single CI job reads `git log` since the last tag, determines patch/minor/major bump, patches the PHP file in the working tree only (no commit), builds the zip, tags, and creates the release. No external versioning tools — pure bash.

**Tech Stack:** GitHub Actions, bash, `git describe`, `sed`, `gh` CLI, `npm`/`wp-scripts`

---

### Task 1: Replace version strings with the VERSION placeholder

**Files:**
- Modify: `wp-media-folders.php:6` — plugin header version
- Modify: `wp-media-folders.php:16` — PHP constant

- [ ] **Step 1: Replace the plugin header version**

Edit line 6 of `wp-media-folders.php`:
```php
 * Version:           VERSION
```

- [ ] **Step 2: Replace the PHP constant**

Edit line 16 of `wp-media-folders.php`:
```php
define( 'WPMF_VERSION', 'VERSION' );
```

- [ ] **Step 3: Verify the sed commands that CI will use work on this file**

Run from repo root:
```bash
cp wp-media-folders.php /tmp/wp-test.php
sed -i '' "s/Version:           VERSION/Version:           9.9.9/" /tmp/wp-test.php
sed -i '' "s/define( 'WPMF_VERSION', 'VERSION' )/define( 'WPMF_VERSION', '9.9.9' )/" /tmp/wp-test.php
grep -n "9.9.9" /tmp/wp-test.php
```

Expected output:
```
6: * Version:           9.9.9
16:define( 'WPMF_VERSION', '9.9.9' );
```

Both lines must appear. If only one does, the sed pattern on the other doesn't match — fix the pattern in `release.yml` (Task 2) before proceeding.

> **Note:** `sed -i ''` is macOS syntax. CI runs Linux where `sed -i` (no `''`) is correct. The workflow uses Linux syntax.

- [ ] **Step 4: Commit**

```bash
git add wp-media-folders.php
git commit -m "chore: replace hardcoded version with VERSION placeholder"
```

---

### Task 2: Rewrite release.yml with conventional-commits version bump

**Files:**
- Modify: `.github/workflows/release.yml` — full rewrite

- [ ] **Step 1: Overwrite `.github/workflows/release.yml` with the following content**

```yaml
name: Build and Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine Version
        id: version
        run: |
          LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
          if [ -z "$LAST_TAG" ]; then
            LAST_VERSION="1.0.0"
          else
            LAST_VERSION="${LAST_TAG#v}"
          fi

          if [ -z "$LAST_TAG" ]; then
            COMMITS=$(git log --pretty=format:"%s%n%b")
          else
            COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%s%n%b")
          fi

          BUMP="patch"
          if echo "$COMMITS" | grep -qE "^.+(\(.+\))?!:|BREAKING CHANGE:"; then
            BUMP="major"
          elif echo "$COMMITS" | grep -qE "^feat(\(.+\))?:"; then
            BUMP="minor"
          fi

          IFS='.' read -r MAJOR MINOR PATCH <<< "$LAST_VERSION"
          case "$BUMP" in
            major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
            minor) MINOR=$((MINOR+1)); PATCH=0 ;;
            patch) PATCH=$((PATCH+1)) ;;
          esac
          NEW_VERSION="$MAJOR.$MINOR.$PATCH"

          echo "new_version=$NEW_VERSION" >> $GITHUB_OUTPUT
          echo "tag=v$NEW_VERSION" >> $GITHUB_OUTPUT

      - name: Inject Version into Source
        run: |
          sed -i "s/Version:           VERSION/Version:           ${{ steps.version.outputs.new_version }}/" wp-media-folders.php
          sed -i "s/define( 'WPMF_VERSION', 'VERSION' )/define( 'WPMF_VERSION', '${{ steps.version.outputs.new_version }}' )/" wp-media-folders.php

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Package Plugin
        run: |
          npm ci
          npm run package

      - name: Tag and Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git tag "${{ steps.version.outputs.tag }}"
          git push origin "${{ steps.version.outputs.tag }}"
          gh release create "${{ steps.version.outputs.tag }}" wp-media-folders.zip \
            --title "WP Media Folders ${{ steps.version.outputs.tag }}" \
            --generate-notes
```

- [ ] **Step 2: Verify the version bump logic locally with a quick bash test**

Run:
```bash
bash -c '
COMMITS="feat: add folder rename
fix: correct REST endpoint"
LAST_VERSION="1.0.0"

BUMP="patch"
if echo "$COMMITS" | grep -qE "^.+(\(.+\))?!:|BREAKING CHANGE:"; then
  BUMP="major"
elif echo "$COMMITS" | grep -qE "^feat(\(.+\))?:"; then
  BUMP="minor"
fi

IFS="." read -r MAJOR MINOR PATCH <<< "$LAST_VERSION"
case "$BUMP" in
  major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR+1)); PATCH=0 ;;
  patch) PATCH=$((PATCH+1)) ;;
esac
echo "$MAJOR.$MINOR.$PATCH"
'
```

Expected output: `1.1.0` (because `feat:` → minor bump).

Run again replacing `feat:` with `fix:` in COMMITS — expected: `1.0.1`.
Run again adding `BREAKING CHANGE:` line — expected: `2.0.0`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat: compute semver from conventional commits in release workflow"
```
