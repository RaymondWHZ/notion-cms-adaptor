---
title: Introduction
description: Learn what Notion CMS Adaptor is and why you should use it.
---

Notion CMS Adaptor provides a convenient way for developers to build websites using Notion as a CMS. It solves the most significant obstacle when using Notion as a CMS: **type safety and conversion between tedious Notion types and native JavaScript types**.

## The Problem

When working with Notion's API directly, you face several challenges:

1. **Complex Type Structures** - Notion returns deeply nested objects for simple values like text or numbers
2. **Manual Type Conversion** - You need to write boilerplate code to extract values from Notion's property format
3. **No Type Inference** - TypeScript can't automatically infer the types of your converted values
4. **Database Discovery** - Managing multiple database IDs across your project is cumbersome

## The Solution

Notion CMS Adaptor solves these problems by providing:

- **Schema Definitions** - Define your database structure once, with automatic TypeScript type inference
- **Built-in Converters** - Pre-defined handlers for common conversions (text, numbers, dates, etc.)
- **Auto-Discovery** - Reference databases by name instead of managing IDs
- **Type-Safe Mutations** - Insert and update entries with validated input types

## How It Works

```typescript
// Instead of this:
const rawTitle = page.properties.Name;
let title = '';
if (rawTitle.type === 'title' && rawTitle.title.length > 0) {
  title = rawTitle.title.map(t => t.plain_text).join('');
}

// You write this:
const schema = {
  name: title().plainText(),
};
// And get a typed { name: string } object automatically
```

## Key Concepts

### Schema Definition

A schema defines how your Notion database properties map to TypeScript types. Each property has a **handler** that converts the Notion value to your desired type.

```typescript
const dbSchemas = createDBSchemas({
  posts: {
    _id: metadata("id"),
    name: title().plainText(),
    published: checkbox().boolean(),
    tags: multi_select().strings(),
  },
});
```

### Property Types

The library provides functions for all Notion property types:
- `checkbox`, `title`, `rich_text`, `number`
- `select`, `multi_select`, `status`
- `date`, `files`, `url`, `email`, `phone_number`
- `formula`, `rollup`, `relation`
- `created_time`, `last_edited_time`, `created_by`, `last_edited_by`
- `unique_id`, `verification`

### Mutability

Properties are either **mutable** (can be written to) or **immutable** (read-only). The library tracks this in the type system, so you can only include mutable properties when inserting or updating entries.

### Custom Property Names

You can map TypeScript property names to different Notion property names:

```typescript
// TypeScript key: isDone, Notion property: Done
isDone: checkbox("Done").boolean(),
```

## Next Steps

- [Quick Start](../quick-start/) - Set up your first project
- [Configuration](../configuration/) - Learn about client configuration options
- [Schema Types](../../reference/schema-types/) - Full reference of all property types
