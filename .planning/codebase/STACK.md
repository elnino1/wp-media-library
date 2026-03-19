# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- PHP 7.0+ - Backend plugin development, WordPress hooks/actions, REST API endpoints
- JavaScript (ES6+) - React frontend for media library UI
- SCSS - Component styling

**Secondary:**
- JSX - React component templates
- XML - PHPUnit test configuration

## Runtime

**Environment:**
- WordPress (latest) - Application framework
- Node.js (version unspecified, see Development notes) - Build toolchain

**Package Manager:**
- npm - JavaScript dependency management
- Composer - PHP dependency management (dev-only)

**Lockfiles:**
- `package-lock.json` - Present (775KB)
- `composer.lock` - Present (68KB)

## Frameworks

**Core:**
- WordPress 6.0+ - CMS framework and REST API infrastructure
- React - Frontend UI framework via `@wordpress/element`
- dnd-kit (`@dnd-kit/core` ^6.1.0, `@dnd-kit/sortable` ^8.0.0, `@dnd-kit/utilities` ^3.2.2) - Drag-and-drop library

**Testing:**
- Jest - JavaScript unit test runner (via `@wordpress/scripts`)
- PHPUnit ^9.6 - PHP unit testing framework
- React Testing Library (`@testing-library/react` ^14.0.0) - Component testing utilities

**Build/Dev:**
- `@wordpress/scripts` ^27.0.0 - Build toolchain for WordPress plugins (webpack, Babel, ESLint)
- `@wordpress/env` ^9.0.0 - Local WordPress development environment

## Key Dependencies

**Critical:**
- `@wordpress/api-fetch` - Provides apiFetch for REST API communication in React
- `@wordpress/element` - React utilities and integration layer for WordPress
- `@wordpress/url` - URL manipulation utilities (addQueryArgs)
- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - Sortable list enhancement for drag-and-drop

**Infrastructure:**
- `yoast/phpunit-polyfills` ^2.0 - PHPUnit compatibility layer for older PHP versions
- `phpunit/phpunit` ^9.6 - PHP testing framework

## Configuration

**Environment:**
- WordPress configuration via `.wp-env.json`:
  - Core: WordPress/WordPress (latest)
  - Plugins: Current directory (`.`)
  - No custom environment variables defined

**Build:**
- Build output: `build/` directory (created by `wp-scripts build`)
- Entry point: `src/index.js` compiles to `build/index.js`
- Styles: `src/style.scss` processed by webpack
- No custom webpack/build config - uses `@wordpress/scripts` defaults

**Plugin Metadata:**
- Main plugin file: `wp-media-folders.php`
- Constants defined:
  - `WPMF_VERSION` = "1.0.0"
  - `WPMF_PLUGIN_DIR` = plugin directory path
  - `WPMF_PLUGIN_URL` = plugin URL

## Platform Requirements

**Development:**
- Node.js (unspecified version - no `.nvmrc` or `engines` field in package.json)
- npm (any recent version compatible with Node)
- PHP 7.0+ (no explicit version constraint in composer.json)
- WordPress 6.0+ with REST API enabled

**Production:**
- WordPress 6.0+ installation
- PHP 7.0+ (tested environment assumed compatible)
- Modern browser with ES6+ support (React SPA)
- Requires "upload_files" capability for media operations

## Build & Distribution

**Build Scripts:**
```bash
npm run build       # Compiles React/SCSS via wp-scripts
npm run start       # Watch mode development
npm run package     # Creates wp-media-folders.zip with production assets
```

**Package Output:**
- Format: ZIP file (`wp-media-folders.zip`)
- Contents: Production-ready PHP and minified JavaScript/CSS only
- Distribution: Upload to WordPress Plugins > Add New

## Performance Characteristics

- Modern React SPA (Single Page Application) eliminates page reloads
- dnd-kit optimized drag-and-drop with activation constraints (8px distance)
- Media pagination: 20 items per page by default (configurable in `src/api/client.js`)
- REST API endpoints use WordPress built-in taxonomy API for minimal database overhead

---

*Stack analysis: 2026-03-19*
