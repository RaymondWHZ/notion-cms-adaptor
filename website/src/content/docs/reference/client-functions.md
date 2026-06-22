---
title: Client Functions
description: Complete reference for query and mutation functions.
---

This reference covers all functions available on the Notion CMS Adaptor client.

## Query Functions

### query

Query a database and return all matching entries.

```typescript
const posts = await client.query('posts');

// With filters and sorting
const publishedPosts = await client.query('posts', {
  filter: {
    property: 'status',
    status: { equals: 'published' },
  },
  sorts: [
    { property: 'publishedAt', direction: 'descending' },
  ],
});
```

**Parameters:**
- `dbName` - The name of the database (as defined in your schema)
- `options` - Optional Notion API query parameters (filter, sorts, page_size, start_cursor)

**Returns:** `Promise<T[]>` - Array of typed objects

### queryFirst

Query a database and return only the first matching entry.

```typescript
const latestPost = await client.queryFirst('posts', {
  sorts: [
    { property: 'publishedAt', direction: 'descending' },
  ],
});
```

**Parameters:**
- `dbName` - The name of the database
- `options` - Optional Notion API query parameters

**Returns:** `Promise<T | null>` - Single typed object or null

### queryFirstWithContent

Query and return the first matching entry with its page content (blocks).

```typescript
const post = await client.queryFirstWithContent('posts', 'content', {
  filter: {
    property: 'slug',
    rich_text: { equals: 'my-post-slug' },
  },
});
// post.content contains BlockObjectResponse[]
```

**Parameters:**
- `dbName` - The name of the database
- `contentFieldName` - The property name to attach content to
- `options` - Optional Notion API query parameters

**Returns:** `Promise<T & { [contentFieldName]: BlockObjectResponse[] } | null>`

### queryOneById

Query a single page by its Notion page ID.

```typescript
const post = await client.queryOneById('posts', 'abc123-page-id');
```

**Parameters:**
- `dbName` - The name of the database
- `pageId` - The Notion page ID

**Returns:** `Promise<T | null>` - Single typed object or null

### queryOneWithContentById

Query a single page by ID and include its content.

```typescript
const post = await client.queryOneWithContentById('posts', 'abc123-page-id', 'content');
// post.content contains BlockObjectResponse[]
```

**Parameters:**
- `dbName` - The name of the database
- `pageId` - The Notion page ID
- `contentFieldName` - The property name to attach content to

**Returns:** `Promise<T & { [contentFieldName]: BlockObjectResponse[] } | null>`

### queryOneByUniqueId

Query a single page by its unique ID property value.

```typescript
// Requires a unique_id property in your schema
const dbSchemas = createDBSchemas({
  posts: {
    uid: unique_id().stringWithPrefix(),
    // ...
  },
});

const post = await client.queryOneByUniqueId('posts', 'BLOG-42');
```

**Parameters:**
- `dbName` - The name of the database
- `uniqueId` - The unique ID value (number or string with prefix)

**Returns:** `Promise<T | null>` - Single typed object or null

### queryOneWithContentByUniqueId

Query by unique ID and include page content.

```typescript
const post = await client.queryOneWithContentByUniqueId('posts', 'BLOG-42', 'content');
```

**Parameters:**
- `dbName` - The name of the database
- `uniqueId` - The unique ID value
- `contentFieldName` - The property name to attach content to

**Returns:** `Promise<T & { [contentFieldName]: BlockObjectResponse[] } | null>`

### queryPageContentById

Query only the content (blocks) of a page.

```typescript
const blocks = await client.queryPageContentById('abc123-page-id');
// Returns BlockObjectResponse[]
```

**Parameters:**
- `pageId` - The Notion page ID

**Returns:** `Promise<BlockObjectResponse[]>` - Array of block objects

### queryKV

Convert a database into a key-value object using designated key and value properties.

```typescript
// Useful for settings or metadata tables
const dbSchemas = createDBSchemas({
  settings: {
    key: title().plainText(),
    value: rich_text().plainText(),
  },
});

const settings = await client.queryKV('settings', 'key', 'value');
// Returns { [key: string]: string }
```

**Parameters:**
- `dbName` - The name of the database
- `keyField` - The property to use as keys
- `valueField` - The property to use as values

**Returns:** `Promise<Record<string, V>>` - Key-value object

### queryText

Query the content of a page in a database by its title, useful for storing rich text content.

```typescript
const aboutContent = await client.queryText('pages', 'About Us');
// Returns the page content as blocks
```

**Parameters:**
- `dbName` - The name of the database
- `title` - The title to search for

**Returns:** `Promise<BlockObjectResponse[] | null>` - Page content or null

## Mutation Functions

Mutation functions require your Notion integration to have write capabilities.

### insertEntry

Insert a new page into a database.

```typescript
const newPost = await client.insertEntry('posts', {
  title: 'My New Post',
  slug: 'my-new-post',
  status: 'draft',
  tags: ['announcement'],
});
// Returns the created entry with all properties
```

**Parameters:**
- `dbName` - The name of the database
- `data` - Object with mutable properties only

**Returns:** `Promise<T>` - The created entry

**Type Safety:** Only mutable properties can be included. TypeScript will error if you try to set immutable properties like formula results or created_time.

### updateEntry

Update an existing page in a database.

```typescript
const updated = await client.updateEntry('posts', 'abc123-page-id', {
  status: 'published',
  publishedAt: '2024-01-15',
});
// Returns the updated entry
```

**Parameters:**
- `dbName` - The name of the database
- `pageId` - The Notion page ID to update
- `data` - Object with mutable properties to update

**Returns:** `Promise<T>` - The updated entry

**Note:** The function validates that the page belongs to the specified database before updating.

### deleteEntry

Delete (trash) a page in a database.

```typescript
await client.deleteEntry('posts', 'abc123-page-id');
```

**Parameters:**
- `dbName` - The name of the database
- `pageId` - The Notion page ID to delete

**Returns:** `Promise<void>`

**Note:** The function validates that the page belongs to the specified database before deleting. Pages are moved to trash, not permanently deleted.

## Error Handling

All functions may throw errors for network issues, authentication failures, or invalid operations:

```typescript
try {
  const posts = await client.query('posts');
} catch (error) {
  if (error instanceof APIResponseError) {
    console.error('Notion API error:', error.message);
  }
  throw error;
}
```

## Pagination

For large datasets, use pagination:

```typescript
let allPosts: Post[] = [];
let cursor: string | undefined;

do {
  const response = await client.query('posts', {
    page_size: 100,
    start_cursor: cursor,
  });
  allPosts = allPosts.concat(response);
  // Note: You'll need to access the raw response for cursor
} while (cursor);
```
