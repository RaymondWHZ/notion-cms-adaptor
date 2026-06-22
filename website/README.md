# Notion CMS Adaptor Docs

Documentation website for [notion-cms-adaptor](https://github.com/RaymondWHZ/notion-cms-adaptor).

## Development

```bash
bun install
bun dev
```

## Writing Docs

Add or edit Markdown/MDX files in `src/content/docs/`:

```
src/content/docs/
├── index.mdx              # Homepage
├── guides/                # Getting started guides
│   ├── introduction.md
│   ├── quick-start.md
│   └── configuration.md
└── reference/             # API reference
    ├── schema-types.md
    ├── client-functions.md
    └── type-utilities.md
```

Each file needs frontmatter:

```md
---
title: Page Title
description: Short description for SEO.
---

Your content here...
```

Update sidebar in `astro.config.mjs` when adding new pages.

See [Starlight docs](https://starlight.astro.build/) for more features.

## Build

```bash
bun build
```
