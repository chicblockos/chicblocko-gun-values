# Chicblocko Gun Values

Production-ready static website containing 208 Chicblocko customs.

## Features

- Search and category filters
- Collection-order and alphabetical sorting
- Responsive card grid with hover animation
- Keyboard-accessible custom detail dialog with synchronized flip controls
- Optimized WebP assets
- Simple local custom editor with automatic browser saving
- Image upload, value, demand, quantity, gun name, model, and type editing
- JSON backup import and export
- Animated custom-purchase guide with Discord and ticket links
- Lightweight GPU-friendly guide motion with reduced-motion support

## Deploy

Upload everything in this folder to the root of a static host such as GitHub Pages, Netlify, or Cloudflare Pages. Keep the `assets` folder and all file names unchanged.

## Maintenance

The public records live in `assets-data.js`. After changing the source data shape, run `work/prepare-public-data.mjs` from the workspace root. Run `work/production-audit.mjs` to repeat the browser QA suite.

Select **Edit Customs** in the header to manage the collection. Edits save in
the current browser only; export a JSON backup to protect or move them. Because
this is a static website, browser edits are not automatically published to
every visitor.
