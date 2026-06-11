# Production Audit Report

Audit date: June 10, 2026

Target: `outputs/chicblocko-gun-values-public`

## Fixed Issues

| Severity | Issue found | File affected | Fix applied | Why necessary |
|---|---|---|---|---|
| High | Public content could be silently overridden by stale admin-era `localStorage` data | `app.js` | Removed browser storage and made the deployed dataset the only source of truth | Prevents inconsistent or user-modified content from replacing production data |
| High | 220 unused PNG originals added 40.47 MB to the deployment | `assets/` | Removed all unreferenced PNG files after validating every live image reference | Reduced transfer/storage cost and deployment failures |
| High | Hidden synthetic numeric values still controlled value sorting even though cards showed creator credit | `assets-data.js`, `index.html`, `app.js` | Removed fake numeric fields and misleading high/low sort options | Prevents users from receiving an inaccurate ordering presented as real value data |
| Medium | Generated CSS contained duplicated themes and a complete dead admin interface | `styles.css` | Replaced the layered 38 KB stylesheet with one production stylesheet containing only live selectors | Removed conflicts, reduced maintenance risk, and fixed hover ownership bugs |
| Medium | Card reveal animation could retain control of `transform` and block hover | `styles.css`, `app.js` | Scoped hover animation correctly and automatically clears reveal state | Restores reliable card pop animation after search/filter/sort |
| Medium | Public page loaded stale cached CSS and JavaScript | `index.html` | Bumped versioned asset URLs | Ensures updated deployments replace old browser-cached files |
| Medium | Every card installed separate click and keyboard listeners and appended directly to the live DOM | `app.js` | Added event delegation and batched rendering with `DocumentFragment` | Reduces listener count and render work across 208 cards |
| Medium | External links lacked explicit opener protection | `index.html` | Added `target="_blank"` with `rel="noopener noreferrer"` | Prevents opened pages from controlling the source tab |
| Medium | No content security policy or referrer policy | `index.html` | Added a restrictive CSP and `no-referrer` policy | Limits script/resource injection and unnecessary referrer disclosure |
| Medium | Search, filters, results, and dialog semantics were incomplete | `index.html`, `app.js`, `styles.css` | Added a skip link, explicit labels, `aria-pressed`, live results, dialog labeling, focus styles, and descriptive card labels | Improves screen-reader and keyboard usability |
| Medium | Images lacked intrinsic dimensions and useful generated alt text | `index.html`, `app.js` | Added width/height attributes and item-specific alt text | Reduces layout shift and improves accessibility |
| Medium | Missing data or a failed image had no usable fallback | `app.js`, `styles.css` | Added empty-dataset and image-failure states | Avoids blank or broken interfaces when assets fail |
| Low | “Updated today” became false after the deployment date | `index.html`, `app.js` | Replaced it with a real machine-readable update date formatted by JavaScript | Avoids permanently misleading freshness claims |
| Low | Unused Google Fonts added external requests while the final theme used system fonts | `index.html` | Removed font preconnects and stylesheet request | Improves privacy, speed, and offline reliability |
| Low | Missing search metadata and crawler instructions | `index.html`, `robots.txt` | Added description, robots metadata, color scheme, and `robots.txt` | Improves search presentation and crawler behavior |
| Low | Generic `#` home links created unnecessary history entries | `index.html` | Pointed home links to `#values` | Provides predictable navigation |
| Low | Runtime repaired inconsistent raw categories on every page load | `assets-data.js`, `work/prepare-public-data.mjs` | Wrote final EXT, Drum, ARP Drum, and AK47 categories into production data | Simplifies runtime logic and prevents category drift |

## Validation Results

- JavaScript syntax checks passed for `app.js` and `assets-data.js`.
- CSS structure passed with balanced braces and no admin selectors.
- All 208 records have unique IDs and valid required fields.
- All 208 referenced gun images exist.
- All 209 WebP assets decoded successfully; no corrupt images found.
- No duplicate HTML IDs, unnamed controls, or images missing `alt`.
- Exactly one page-level `h1` and a valid meta description.
- Desktop browser QA passed at 1440 x 1000.
- Tablet browser QA passed at 768 x 1024.
- Mobile browser QA passed at 390 x 844.
- Search, category filters, sorting, hover, keyboard activation, detail dialog, and close actions passed.
- No console errors, page errors, failed local requests, or horizontal overflow.
- Roblox link resolves to the ChicBlocko game page.
- Discord button uses the requested `https://discord.gg/chicblocko` invite URL.

## Performance Result

- Production folder reduced from roughly 44 MB to 3.49 MB.
- CSS reduced from 38,235 bytes to about 20.6 KB.
- Dataset reduced from 56,498 bytes to about 27.4 KB.
- Removed external font requests and 220 unused images.

## Remaining Deployment Note

The site is static and has no API, authentication, payment flow, or server-side state to audit. A production host should also set HTTP security headers where supported; the included meta CSP provides a static-host fallback.
