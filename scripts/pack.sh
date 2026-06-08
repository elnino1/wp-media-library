#!/usr/bin/env bash
# Usage:
#   npm run pack           — auto-bump version from git tags (same logic as CI)
#   npm run pack 1.2.3     — use an explicit version
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
PLUGIN_FILE="$ROOT/wp-media-library.php"

# ── Version resolution ────────────────────────────────────────────────────────

if [ -n "${1:-}" ]; then
    NEW_VERSION="$1"
else
    LAST_TAG=$(git -C "$ROOT" describe --tags --abbrev=0 2>/dev/null || echo "")

    if [ -z "$LAST_TAG" ]; then
        LAST_VERSION="1.0.0"
        SUBJECTS=$(git -C "$ROOT" log --pretty=format:"%s")
        BODIES=$(git   -C "$ROOT" log --pretty=format:"%b")
    else
        LAST_VERSION="${LAST_TAG#v}"
        SUBJECTS=$(git -C "$ROOT" log "${LAST_TAG}..HEAD" --pretty=format:"%s")
        BODIES=$(git   -C "$ROOT" log "${LAST_TAG}..HEAD" --pretty=format:"%b")
    fi

    BUMP="patch"
    if echo "$SUBJECTS" | grep -qE "^[a-z]+(\([^)]+\))?!:" || \
       echo "$BODIES"   | grep -qE "^BREAKING CHANGE:"; then
        BUMP="major"
    elif echo "$SUBJECTS" | grep -qE "^feat(\(.+\))?:"; then
        BUMP="minor"
    fi

    IFS='.' read -r MAJOR MINOR PATCH <<< "$LAST_VERSION"
    case "$BUMP" in
        major) MAJOR=$((MAJOR+1)); MINOR=0;        PATCH=0 ;;
        minor)                     MINOR=$((MINOR+1)); PATCH=0 ;;
        patch)                                     PATCH=$((PATCH+1)) ;;
    esac
    NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

echo "→ version: $NEW_VERSION"

# ── Inject version, restore on exit ──────────────────────────────────────────

restore_php() {
    git -C "$ROOT" checkout -- wp-media-library.php 2>/dev/null || true
}
trap restore_php EXIT

# perl -i works identically on macOS and Linux
perl -i -pe "s/Version:           VERSION/Version:           $NEW_VERSION/" "$PLUGIN_FILE"
perl -i -pe "s|define\( 'WPMF_VERSION', 'VERSION' \)|define( 'WPMF_VERSION', '$NEW_VERSION' )|" "$PLUGIN_FILE"

# ── Build + package ───────────────────────────────────────────────────────────

(cd "$ROOT" && npm run build)
(cd "$ROOT" && npm run package)

# ── Name the zip ─────────────────────────────────────────────────────────────

OUT="wp-media-library-${NEW_VERSION}.zip"
mv "$ROOT/wp-media-library.zip" "$ROOT/$OUT"

echo "✓ $OUT"
