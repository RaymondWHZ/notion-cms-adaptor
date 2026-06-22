---
title: Configuration
description: Learn about all configuration options for Notion CMS Adaptor.
---

This guide covers all configuration options available when setting up the Notion CMS Adaptor client.

## Client Configuration

The `createNotionDBClient` function accepts a configuration object with several options.

### Authentication

You can provide authentication in two ways:

#### Option 1: Notion Token (Recommended)

```typescript
const client = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  // ... other options
});
```

#### Option 2: Existing Notion Client

If you already have a configured Notion client instance:

```typescript
import { Client } from '@notionhq/client';

const notionClient = new Client({
  auth: process.env.NOTION_TOKEN!,
  notionVersion: '2025-09-03',
});

const client = createNotionDBClient({
  notionClient,
  // ... other options
});
```

### Data Source Configuration

You must provide either `autoDetectDataSources` or `dataSourceMap`.

#### Auto-Discovery (Recommended)

Auto-discovery allows you to reference databases by name instead of managing IDs:

```typescript
const client = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  autoDetectDataSources: {
    pageId: process.env.NOTION_CMS_PAGE_ID!,
    dataSourcePrefix: 'db: ', // Optional, defaults to "db: "
  },
  dbSchemas,
});
```

With this setup, if your Notion page contains a database named "db: posts", you can reference it as `'posts'` in your queries.

#### Manual Mapping

If you prefer to manage database IDs manually:

```typescript
const client = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  dataSourceMap: {
    posts: 'abc123-your-database-id',
    authors: 'def456-another-database-id',
  },
  dbSchemas,
});
```

### Schema Definition

The `dbSchemas` option defines the structure of your databases:

```typescript
const dbSchemas = createDBSchemas({
  posts: {
    _id: metadata("id"),
    title: title().plainText(),
    // ... more properties
  },
  authors: {
    _id: metadata("id"),
    name: title().plainText(),
    // ... more properties
  },
});
```

## Schema Configuration

### Custom Property Names

By default, the TypeScript property name is used as the Notion property name. You can override this:

```typescript
const dbSchemas = createDBSchemas({
  tasks: {
    _id: metadata("id"),
    // TypeScript: isDone, Notion: "Done"
    isDone: checkbox("Done").boolean(),
    // TypeScript: desc, Notion: "Description"
    desc: rich_text("Description").plainText(),
    // TypeScript: name, Notion: "name" (same)
    name: title().plainText(),
  },
});
```

This is useful when:
- Notion property names contain spaces or special characters
- You want cleaner TypeScript property names
- You're working with existing Notion databases

### Multiple Views of the Same Database

You can define multiple schemas pointing to the same Notion database with different property selections or conversions:

```typescript
const dbSchemas = createDBSchemas({
  // Full post data
  posts: {
    _id: metadata("id"),
    title: title().plainText(),
    content: rich_text().raw(), // Full rich text
    tags: multi_select().strings(),
    cover: files().singleNotionImageUrl(),
  },
  // Lightweight view for listings
  posts__summary: {
    _id: metadata("id"),
    title: title().plainText(),
    content: rich_text().plainText(), // Just plain text
  },
});
```

Both schemas can reference the same "db: posts" database in Notion.

## Environment Variables

We recommend storing sensitive configuration in environment variables:

```bash
# .env
NOTION_TOKEN=secret_xxxxxxxxxxxxx
NOTION_CMS_PAGE_ID=abc123def456
```

### Environment Variable Best Practices

1. **Never commit tokens** - Add `.env` to `.gitignore`
2. **Use different tokens per environment** - Create separate integrations for development and production
3. **Limit integration permissions** - Only grant read access if you don't need mutations

## TypeScript Configuration

For the best type inference experience, ensure your `tsconfig.json` has strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Next Steps

- [Schema Types](../../reference/schema-types/) - Full reference of property types
- [Client Functions](../../reference/client-functions/) - Query and mutation functions
- [Type Utilities](../../reference/type-utilities/) - TypeScript utilities for working with schemas
