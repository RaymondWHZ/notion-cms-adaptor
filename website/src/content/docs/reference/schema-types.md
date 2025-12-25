---
title: Schema Types
description: Complete reference for all property types and their conversion methods.
---

This reference covers all supported Notion property types and their available conversion methods.

## Default Conversions

All property types include these default methods:

| Method | Description |
|--------|-------------|
| `raw()` | Return the native Notion property value |
| `rawWithDefault(value)` | Return raw value with a default for null/undefined |
| `handleUsing(handler)` | Custom handler function (makes mutable types immutable) |
| `handleAndComposeUsing({handler, composer})` | Custom handler + composer (mutable types only) |

## Property Types

### checkbox

**Mutability:** Mutable

```typescript
checkbox().boolean()       // Returns boolean
checkbox("Is Done").raw()  // Custom property name
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `boolean()` | `boolean` | Checkbox state (same as raw) |

### title

**Mutability:** Mutable

```typescript
title().plainText()        // Returns string
title("Name").raw()        // Returns RichTextItemResponse[]
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `plainText()` | `string` | Concatenated plain text of all rich text items |

### rich_text

**Mutability:** Mutable

```typescript
rich_text().plainText()           // Returns string
rich_text("Description").raw()    // Returns RichTextItemResponse[]
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `plainText()` | `string` | Concatenated plain text |

### number

**Mutability:** Mutable

```typescript
number().numberDefaultZero()    // Returns number (0 if null)
number("Count").raw()           // Returns number | null
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `numberDefaultZero()` | `number` | Number with 0 as default |

### select

**Mutability:** Mutable

```typescript
select().optionalString()                     // Returns string | undefined
select().stringEnum('draft', 'published')     // Returns 'draft' | 'published'
select("Priority").raw()                      // Custom property name
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `optionalString()` | `string \| undefined` | Selected option name or undefined |
| `stringEnum(...values)` | Union of values | Type-safe enum of allowed values |

### multi_select

**Mutability:** Mutable

```typescript
multi_select().strings()                              // Returns string[]
multi_select().stringEnums('tag1', 'tag2', 'tag3')    // Returns ('tag1' | 'tag2' | 'tag3')[]
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `strings()` | `string[]` | Array of selected option names |
| `stringEnums(...values)` | `T[]` | Type-safe array of allowed values |

### status

**Mutability:** Mutable

```typescript
status().string()                                     // Returns string
status().stringEnum('todo', 'in-progress', 'done')    // Returns 'todo' | 'in-progress' | 'done'
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `string()` | `string` | Status name |
| `stringEnum(...values)` | Union of values | Type-safe enum of allowed values |

### date

**Mutability:** Mutable

```typescript
date().startDate()      // Returns string
date().dateRange()      // Returns { start: string, end: string }
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `startDate()` | `string` | Only the start date string |
| `dateRange()` | `{ start: string, end: string }` | Object with start and end dates (empty strings if not set) |

### files

**Mutability:** Partial (read-only for some features)

```typescript
files().urls()                     // Returns string[]
files().singleUrl()                // Returns string
files().notionImageUrls()          // Returns string[] (optimized URLs)
files().singleNotionImageUrl()     // Returns string (optimized URL)
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `urls()` | `string[]` | Array of file URLs |
| `singleUrl()` | `string` | First file URL only |
| `notionImageUrls()` | `string[]` | URLs using Notion's image optimization |
| `singleNotionImageUrl()` | `string` | First URL with Notion's image optimization |

### url

**Mutability:** Mutable

```typescript
url().string()    // Returns string (empty string if null)
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `string()` | `string` | URL string with empty string default |

### email

**Mutability:** Mutable

```typescript
email().string()    // Returns string (empty string if null)
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `string()` | `string` | Email string with empty string default |

### phone_number

**Mutability:** Mutable

```typescript
phone_number().string()    // Returns string (empty string if null)
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `string()` | `string` | Phone number string with empty string default |

### relation

**Mutability:** Mutable

```typescript
relation().ids()          // Returns string[]
relation().singleId()     // Returns string
relation().objects()      // Returns related objects (with rollup fields)
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `ids()` | `string[]` | Array of related page IDs |
| `singleId()` | `string` | First related page ID |
| `objects()` | Object array | Constructed objects from rollup fields |

### formula

**Mutability:** Immutable

```typescript
formula().string()                // Returns string
formula().numberDefaultZero()     // Returns number
formula().booleanDefaultFalse()   // Returns boolean
formula().dateRange()             // Returns { start: string, end: string }
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `string()` | `string` | Formula result as string |
| `numberDefaultZero()` | `number` | Numeric result with 0 default |
| `booleanDefaultFalse()` | `boolean` | Boolean result with false default |
| `dateRange()` | `{ start: string, end: string }` | Date range if formula returns date |

### rollup

**Mutability:** Immutable

```typescript
rollup().numberDefaultZero()              // Returns number
rollup().dateRange()                      // Returns { start: string, end: string }
rollup().handleSingleUsing(handler)       // Custom handler for first item
rollup().handleArrayUsing(handler)        // Custom handler for all items
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `numberDefaultZero()` | `number` | Numeric rollup with 0 default |
| `dateRange()` | `{ start: string, end: string }` | Date range rollup |
| `handleSingleUsing(handler)` | Custom | Handle first array item |
| `handleArrayUsing(handler)` | Custom | Handle full rollup array |

### unique_id

**Mutability:** Immutable

```typescript
unique_id().number()             // Returns number
unique_id().stringWithPrefix()   // Returns string (e.g., "PROJ-123")
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `number()` | `number` | Only the numeric part |
| `stringWithPrefix()` | `string` | Full ID with prefix |

### created_time / last_edited_time

**Mutability:** Immutable

```typescript
created_time().timeString()        // Returns string (ISO timestamp)
last_edited_time().timeString()    // Returns string (ISO timestamp)
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `timeString()` | `string` | ISO timestamp string |

### created_by / last_edited_by

**Mutability:** Immutable

```typescript
created_by().name()        // Returns string (user or bot name)
last_edited_by().name()    // Returns string (user or bot name)
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `name()` | `string` | Name of user or bot |

### people

**Mutability:** Partial (read-only)

```typescript
people().names()    // Returns string[]
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `names()` | `string[]` | Array of user/bot names |

### verification

**Mutability:** Immutable

Only supports default conversions (`raw()`, `rawWithDefault()`).

## Metadata Properties

Use `metadata()` to access page metadata:

```typescript
metadata("id")                // Page ID (immutable)
metadata("created_time")      // Creation timestamp (immutable)
metadata("last_edited_time")  // Last edit timestamp (immutable)
metadata("url")               // Page URL (immutable)
metadata("icon")              // Page icon (mutable)
metadata("cover")             // Page cover (mutable)
metadata("in_trash")          // Trash status (mutable)
```

### Mutable Metadata Keys

- `icon`
- `cover`
- `in_trash`
- `is_locked`

### Immutable Metadata Keys

- `id`
- `created_time`
- `last_edited_time`
- `url`
- `public_url`
- `parent`
- `created_by`
- `last_edited_by`
- `archived`

## Custom Handlers

For complex conversions, use custom handlers:

```typescript
// Immutable custom handler
rollup().handleArrayUsing((items) => {
  return items.reduce((acc, item) => {
    if (item.type === 'status' && item.status) {
      return acc.concat(item.status.name);
    }
    return acc;
  }, [] as string[]);
})

// Mutable custom handler with composer
rich_text().handleAndComposeUsing({
  handler: (items) => items.map(i => i.plain_text).join('').toUpperCase(),
  composer: (value) => [{ type: 'text', text: { content: value.toLowerCase() } }],
})
```
