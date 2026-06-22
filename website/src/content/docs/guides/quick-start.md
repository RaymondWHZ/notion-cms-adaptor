---
title: Quick Start
description: Get up and running with Notion CMS Adaptor in minutes.
---

This guide will walk you through setting up Notion CMS Adaptor for your project.

## Prerequisites

- Node.js 18+ (or Bun, Deno)
- A Notion account with an integration token
- A Notion database to use as your CMS

## Step 1: Install the Package

```bash
npm install notion-cms-adaptor
# or
yarn add notion-cms-adaptor
# or
pnpm install notion-cms-adaptor
# or
bun add notion-cms-adaptor
```

## Step 2: Create a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name and select the workspace
4. Copy the "Internal Integration Token"

## Step 3: Share Your Database

1. Open your Notion database page
2. Click "Share" in the top right
3. Invite your integration by name
4. The integration now has access to this database

## Step 4: Set Up Auto-Discovery (Recommended)

Create a page in Notion that will contain all your CMS databases. Name each database with a `db: ` prefix:

```
My CMS Page
├── db: posts
├── db: authors
└── db: categories
```

Copy the page ID from the URL (the part after the page name and before the `?`).

## Step 5: Define Your Schema

Create a file for your database schemas:

```typescript
// lib/notion.ts
import {
  createDBSchemas,
  createNotionDBClient,
  DBObjectTypesInfer,
  metadata,
  title,
  rich_text,
  multi_select,
  files,
  status,
  date,
  relation,
} from 'notion-cms-adaptor';

// Define schemas for each database
const dbSchemas = createDBSchemas({
  posts: {
    _id: metadata("id"),
    title: title().plainText(),
    slug: rich_text().plainText(),
    content: rich_text().raw(),
    tags: multi_select().strings(),
    cover: files().singleNotionImageUrl(),
    status: status().stringEnum('draft', 'published', 'archived'),
    publishedAt: date("Published Date").startDate(),
    author: relation().singleId(),
  },
  authors: {
    _id: metadata("id"),
    name: title().plainText(),
    bio: rich_text().plainText(),
    avatar: files().singleUrl(),
  },
});

// Infer types from schemas
type DBObjectTypes = DBObjectTypesInfer<typeof dbSchemas>;
export type Post = DBObjectTypes['posts'];
export type Author = DBObjectTypes['authors'];

// Create the client
export const notionClient = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  autoDetectDataSources: {
    pageId: process.env.NOTION_CMS_PAGE_ID!,
  },
  dbSchemas,
});
```

## Step 6: Query Your Data

```typescript
import { notionClient, Post } from './lib/notion';

// Get all published posts
export async function getPublishedPosts(): Promise<Post[]> {
  return await notionClient.query('posts', {
    filter: {
      property: 'status',
      status: { equals: 'published' },
    },
    sorts: [
      { property: 'Published Date', direction: 'descending' },
    ],
  });
}

// Get a single post by slug
export async function getPostBySlug(slug: string): Promise<Post | null> {
  return await notionClient.queryFirst('posts', {
    filter: {
      property: 'slug',
      rich_text: { equals: slug },
    },
  });
}

// Get all authors
export async function getAuthors(): Promise<Author[]> {
  return await notionClient.query('authors');
}
```

## Step 7: Use With Your Framework

### Next.js Example

```typescript
// app/blog/page.tsx
import { getPublishedPosts } from '@/lib/notion';

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <div>
      {posts.map((post) => (
        <article key={post._id}>
          <h2>{post.title}</h2>
          <p>Tags: {post.tags.join(', ')}</p>
        </article>
      ))}
    </div>
  );
}
```

### Astro Example

```astro
---
// src/pages/blog.astro
import { getPublishedPosts } from '../lib/notion';

const posts = await getPublishedPosts();
---

<ul>
  {posts.map((post) => (
    <li>
      <a href={`/blog/${post.slug}`}>{post.title}</a>
    </li>
  ))}
</ul>
```

## Next Steps

- [Configuration](../configuration/) - Learn about all configuration options
- [Schema Types](../../reference/schema-types/) - Explore all available property types and conversions
- [Client Functions](../../reference/client-functions/) - Full reference of query and mutation functions
