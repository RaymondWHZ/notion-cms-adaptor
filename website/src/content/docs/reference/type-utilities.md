---
title: Type Utilities
description: TypeScript utilities for working with schemas and inferred types.
---

This reference covers the TypeScript utility types provided by Notion CMS Adaptor.

## Type Inference Utilities

### DBObjectTypesInfer

Infer the output types for all databases in a schema.

```typescript
import { createDBSchemas, DBObjectTypesInfer } from 'notion-cms-adaptor';

const dbSchemas = createDBSchemas({
  posts: {
    _id: metadata("id"),
    title: title().plainText(),
    status: status().stringEnum('draft', 'published'),
  },
  authors: {
    _id: metadata("id"),
    name: title().plainText(),
  },
});

type DBObjectTypes = DBObjectTypesInfer<typeof dbSchemas>;

// Now you can extract individual types
type Post = DBObjectTypes['posts'];
// { _id: string, title: string, status: 'draft' | 'published' }

type Author = DBObjectTypes['authors'];
// { _id: string, name: string }
```

This is the recommended way to get types for your database objects.

### DBInfer

Infer the output type for a single database schema.

```typescript
import { DBInfer, metadata, title, status } from 'notion-cms-adaptor';

const postSchema = {
  _id: metadata("id"),
  title: title().plainText(),
  status: status().stringEnum('draft', 'published'),
};

type Post = DBInfer<typeof postSchema>;
// { _id: string, title: string, status: 'draft' | 'published' }
```

### DBMutateObjectTypesInfer

Infer the input types for mutations across all databases.

```typescript
import { createDBSchemas, DBMutateObjectTypesInfer } from 'notion-cms-adaptor';

const dbSchemas = createDBSchemas({
  posts: {
    _id: metadata("id"),            // immutable
    title: title().plainText(),      // mutable
    content: rich_text().plainText(), // mutable
    createdAt: metadata("created_time"), // immutable
  },
});

type DBMutateTypes = DBMutateObjectTypesInfer<typeof dbSchemas>;

type PostInput = DBMutateTypes['posts'];
// { title?: string, content?: string }
// Note: _id and createdAt are excluded (immutable)
```

This type is useful for typing function parameters that create or update entries.

### DBMutateInfer

Infer the input type for mutations on a single database schema.

```typescript
import { DBMutateInfer, metadata, title, rich_text } from 'notion-cms-adaptor';

const postSchema = {
  _id: metadata("id"),
  title: title().plainText(),
  content: rich_text().plainText(),
};

type PostInput = DBMutateInfer<typeof postSchema>;
// { title?: string, content?: string }
```

## Usage Patterns

### Exporting Types for Your Application

A common pattern is to export types alongside your client:

```typescript
// lib/notion.ts
import {
  createDBSchemas,
  createNotionDBClient,
  DBObjectTypesInfer,
  DBMutateObjectTypesInfer,
  metadata,
  title,
  rich_text,
  status,
} from 'notion-cms-adaptor';

const dbSchemas = createDBSchemas({
  posts: {
    _id: metadata("id"),
    title: title().plainText(),
    content: rich_text().plainText(),
    status: status().stringEnum('draft', 'published'),
  },
});

// Export inferred types
type DBObjectTypes = DBObjectTypesInfer<typeof dbSchemas>;
type DBMutateTypes = DBMutateObjectTypesInfer<typeof dbSchemas>;

export type Post = DBObjectTypes['posts'];
export type PostInput = DBMutateTypes['posts'];

// Export client
export const notionClient = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  autoDetectDataSources: {
    pageId: process.env.NOTION_CMS_PAGE_ID!,
  },
  dbSchemas,
});
```

### Typing Function Parameters

```typescript
import { Post, PostInput, notionClient } from './lib/notion';

// Function that returns posts
async function getPublishedPosts(): Promise<Post[]> {
  return notionClient.query('posts', {
    filter: { property: 'status', status: { equals: 'published' } },
  });
}

// Function that creates a post
async function createPost(data: PostInput): Promise<Post> {
  return notionClient.insertEntry('posts', data);
}

// Usage
const newPost = await createPost({
  title: 'Hello World',
  content: 'This is my first post',
  status: 'draft',
});
```

### Working with Partial Types

For update operations where you only want to change specific fields:

```typescript
import { PostInput, notionClient } from './lib/notion';

async function updatePostStatus(
  id: string,
  status: PostInput['status']
): Promise<void> {
  await notionClient.updateEntry('posts', id, { status });
}
```

## Helper Functions

### packPlainText

Convert rich text items to plain text.

```typescript
import { packPlainText } from 'notion-cms-adaptor';
import type { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';

const richText: RichTextItemResponse[] = [
  { type: 'text', text: { content: 'Hello ' }, plain_text: 'Hello ', annotations: {...} },
  { type: 'text', text: { content: 'World' }, plain_text: 'World', annotations: {...} },
];

const plainText = packPlainText(richText);
// "Hello World"
```

### convertNotionImage

Convert a Notion image URL to use Notion's image optimization service.

```typescript
import { convertNotionImage } from 'notion-cms-adaptor';

const optimizedUrl = convertNotionImage(
  'page-id-here',
  'https://prod-files-secure.s3.amazonaws.com/...'
);
// Returns URL using Notion's image optimization
```

This is useful when you want to use Notion's CDN for images stored in Notion.

## Type Compatibility

The inferred types are compatible with the Notion SDK types:

```typescript
import type { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';

const dbSchemas = createDBSchemas({
  posts: {
    content: rich_text().raw(), // Returns RichTextItemResponse[]
  },
});

type Post = DBObjectTypesInfer<typeof dbSchemas>['posts'];
// Post['content'] is RichTextItemResponse[]
```

This allows you to use Notion SDK types directly when needed while still benefiting from the type-safe schema definitions.
