# Notion CMS Adaptor

*"The Ultimate Type-Safe Notion Database Toolbox You Need to Use Notion as a Headless CMS"*

## Introduction

Notion CMS Adaptor provides a convenient way for developers to build websites using Notion as a CMS. It solves the most significant obstacle when using Notion as a CMS: type safety and conversion between tedious Notion types and native JavaScript types. It provides a clean interface and a bunch of pre-defined handlers for most common conversions. It also supports automatic database discovery and provides convenient query functions that suit the needs of a typical CMS.

## Features

- **📋 Standard**: Built on top of the official JavaScript SDK provided by Notion (v5.4.0+)
- **🚚 Straightforward type-safety**: Define Notion types and conversion rules, leave the framework to infer types for you
- **🔎 Auto-discovery**: Give the framework only the ID of the root page, it will discover all databases residing under it
- **📦 Minimal**: Only necessary wrapper around underlying Notion API while exposing necessary official structures, like `RichTextItemResponse`
- **🏂 Flexible**: Framework comes with nice defaults but all conversion rules are customizable
- **👍 Ergonomic**: Syntax similar to traditional database wrappers, aiming to offer a database-client-like experience while fitting unique features of Notion

## Installation

```bash
npm install notion-cms-adaptor
# or yarn add notion-cms-adaptor
# or pnpm install notion-cms-adaptor
# or bun add notion-cms-adaptor
```

## Basic Usage

```typescript
import {
  createDBSchemas,
  createNotionDBClient,
  DBObjectTypesInfer,
  files,
  formula,
  metadata,
  multi_select,
  rich_text,
  rollup,
  status,
  title,
} from 'notion-cms-adaptor';

const dbSchemas = createDBSchemas({
  projects: {
    _id: metadata("id"),
    tags: multi_select().stringEnums('personal', 'work', 'backlog'),
    name: title().plainText(),
    description: rich_text().raw(),
    cover: files().singleNotionImageUrl(),
    images: files().notionImageUrls(),
    status: status().stringEnum('in-progress', 'done'),
    active_tasks: formula().numberDefaultZero(),
    task_status: rollup().handleArrayUsing((value): string[] => {
      return value.reduce((acc, item) => {
        if (item.type === 'status' && item.status) {
          return acc.concat(item.status.name);
        }
        return acc;
      }, [] as string[]);
    }),
  },
  projects__overview: {
    // Another view pointing to the same projects database
    _id: metadata("id"),
    tags: multi_select().stringEnums('personal', 'work', 'backlog'),
    name: title().plainText(),
    description: rich_text().plainText(), // Types can be different
    cover: files().singleNotionImageUrl(),
  },
});

type DBObjectTypes = DBObjectTypesInfer<typeof dbSchemas>;
export type Project = DBObjectTypes['projects'];
// type Project = {
//   _id: string,
//   tags: ('personal' | 'work' | 'backlog')[]
//   name: string
//   description: RichTextItemResponse[]
//   cover: string
//   images: string[]
//   status: 'in-progress' | 'done'
//   active_tasks: number
//   task_status: string[]
// }
export type ProjectOverview = DBObjectTypes['projects__overview'];
// type ProjectOverview = {
//   _id: string,
//   tags: ('personal' | 'work' | 'backlog')[]
//   name: string
//   description: string
//   cover: string
// }

const client = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  autoDetectDataSources: {
    pageId: process.env.NOTION_CMS_ENTRY_PAGE_ID!,
  },
  dbSchemas,
});

export async function fetchProjects(): Promise<Project[]> {
  return await client.query('projects', {
    // Raw Notion API query parameters
    // Only without data_source_id and filter_properties as they are managed by framework
    sorts: [
      {
        property: 'name',
        direction: 'ascending',
      },
    ],
    filter: {
      property: 'status',
      status: {
        does_not_equal: 'hidden',
      },
    },
  });
}

export async function addProject(): Promise<Project> {
  return await client.insertEntry('projects', {
    tags: ['work'], // Type definition will prevent adding invalid tags
    name: 'New Project',
    description: [{ type: 'text', text: { content: 'Description' } }],
    status: 'in-progress',
    // You may optionally omit cover and images
    // Type definition prevents adding non-mutable fields: _id, active_tasks, task_status
  });
}
```

## Auto-Detect Data Sources

It is rare that a CMS system requires only one collection, so Notion CMS Adaptor provides a handy functionality that allows databases to be automatically discovered, without the need to copy and paste IDs for each.

You only need to provide the framework with the ID of the page that contains all your databases **on top level**, with each database having a name starting with "db: " (the prefix can be configured). Then, you can reference each database by their name without the prefix when using other functions.

In the basic usage example, the database in Notion in fact has the name "db: projects" and resides on the top level of the page "Project CMS" as follows:

<img width="593" alt="Project Database Example" src="https://github.com/RaymondWHZ/Notion-CMS-Adaptor/assets/30245379/aaa1c46f-391a-44c1-9de9-e9dfefa00b40">

Then, supply the page ID of Project CMS to Notion CMS Adaptor so that the database can be referenced as "projects" in subsequent usages of the framework.

## Client Configuration

The `createNotionDBClient` function accepts several configuration options:

### Authentication

You can provide either a Notion token or an existing Notion client:

```typescript
// Option 1: Using a token (recommended)
const client = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  // ...
});

// Option 2: Using an existing Notion client
import { Client } from '@notionhq/client';

const notionClient = new Client({
  auth: process.env.NOTION_TOKEN!,
  notionVersion: '2025-09-03',
});

const client = createNotionDBClient({
  notionClient,
  // ...
});
```

### Data Source Configuration

You can either use auto-discovery or provide a manual mapping:

```typescript
// Option 1: Auto-discovery (recommended)
const client = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  autoDetectDataSources: {
    pageId: process.env.NOTION_CMS_ENTRY_PAGE_ID!,
    dataSourcePrefix: 'db: ', // Optional, defaults to "db: "
  },
  dbSchemas,
});

// Option 2: Manual mapping
const client = createNotionDBClient({
  notionToken: process.env.NOTION_TOKEN!,
  dataSourceMap: {
    projects: 'your-database-id-here',
    tasks: 'another-database-id-here',
  },
  dbSchemas,
});
```

## Client Functions

### Queries

| Function | Description |
|----------|-------------|
| `query` | Query a database, optionally accepts query parameters to be sent to Notion API, returns a list of converted objects |
| `queryFirst` | Same as `query` except that it returns only the first result as a single object instead of a list |
| `queryOneById` | Query one page using its Notion page ID |
| `queryPageContentById` | Query the content (blocks) of a page by its ID |
| `queryOneWithContentById` | Same as `queryOneById` but also puts the content of the page into a designated field, useful in many blog article scenarios |
| `queryOneByUniqueId` | Query one page using its unique ID property, requires that the database schema contains a unique ID property |
| `queryOneWithContentByUniqueId` | Same as `queryOneByUniqueId` but also puts the content of the page into a designated field |
| `queryKV` | Convert the content of a database into a key-value pair using designated key and value fields, useful for storing metadata |
| `queryText` | Query contents of a page in a database using its title, useful for conveniently storing rich texts |

### Mutations

Mutations require the Notion integration to have write capability.

| Function | Description |
|----------|-------------|
| `insertEntry` | Insert a new page into a database, can only specify properties that are mutable |
| `updateEntry` | Update a page in a database with its ID, can only specify properties that are mutable (validates that the page is in the database) |
| `deleteEntry` | Delete (trash) a page in a database with its ID (validates that the page is in the database) |

## Custom Property Names

By default, the framework uses the TypeScript attribute name as the Notion property name. However, you can specify a different Notion property name by passing it as an argument to the property function:

```typescript
const dbSchemas = createDBSchemas({
  tasks: {
    _id: metadata("id"),
    // TypeScript key is "isDone", but Notion property is named "Done"
    isDone: checkbox("Done").boolean(),
    // TypeScript key is "desc", but Notion property is named "Description"
    desc: rich_text("Description").plainText(),
    // Without argument, uses TypeScript key "name" as Notion property name
    name: title().plainText(),
  },
});
```

This is useful when:
- Notion property names contain spaces or special characters
- You want cleaner TypeScript attribute names
- You're working with existing Notion databases where property names don't match your preferred naming convention

## Metadata Properties

You can reference page metadata (like `id`, `created_time`, `in_trash`, etc.) using the `metadata` function:

```typescript
const dbSchemas = createDBSchemas({
  projects: {
    _id: metadata("id"),
    createdAt: metadata("created_time"),
    inTrash: metadata("in_trash"), // Automatically mutable
    icon: metadata("icon"), // Automatically mutable
    cover: metadata("cover"), // Automatically mutable
    // ... other properties
  },
});
```

The `metadata` function automatically returns a mutable or immutable definition based on the key:
- **Mutable keys**: `icon`, `cover`, `in_trash`, `is_locked`
- **Immutable keys**: All other metadata keys (`id`, `created_time`, `last_edited_time`, `url`, `public_url`, `parent`, `created_by`, `last_edited_by`, `archived`)

### Legacy `__id` Function

The `__id()` function is still available as a shorthand for `metadata("id")`:

```typescript
import { __id } from 'notion-cms-adaptor';

const dbSchemas = createDBSchemas({
  projects: {
    _id: __id(), // Equivalent to metadata("id")
    // ...
  },
});
```

## Supported Schema Types and Conversions

| Type | Mutability | Supported Conversions |
|------|:-----------|----------------------|
| `checkbox` | ✅ Mutable | `boolean()`: Use a boolean value to indicate whether the checkbox is checked (same as raw) |
| `created_by` | ❌ Immutable | `name()`: Use name of either the user or bot |
| `created_time` | ❌ Immutable | `timeString()`: Use the time string (same as raw) |
| `date` | ✅ Mutable | `startDate()`: Use only the start date string<br/>`dateRange()`: Use an object with the form `{ start: string, end: string }`, defaults to empty strings |
| `email` | ✅ Mutable | `string()`: Use the string version of the email (same as rawWithDefault with default value '') |
| `files` | 🚧 Partial | `urls()`: Use an array of URLs to each file<br/>`singleUrl()`: Use only the first URL, ignoring others<br/>`notionImageUrls()`: (Experimental) Assume all URLs are images stored in Notion, convert URLs to use Notion's image optimization<br/>`singleNotionImageUrl()`: (Experimental) Same as above but return only the first URL |
| `formula` | ❌ Immutable | `string()`: Convert any type to string<br/>`numberDefaultZero()`: Attempt to convert to number, default 0<br/>`booleanDefaultFalse()`: Attempt to convert to boolean, default false<br/>`dateRange()`: Same as dateRange for date type |
| `last_edited_by` | ❌ Immutable | `name()`: Use name of either the user or bot |
| `last_edited_time` | ❌ Immutable | `timeString()`: Use the time string (same as raw) |
| `multi_select` | ✅ Mutable | `strings()`: Use an array of names of selected options<br/>`stringEnums()`: Allow only names in the list |
| `number` | ✅ Mutable | `numberDefaultZero()`: Simply use the number (same as rawWithDefault with default value 0) |
| `people` | 🚧 Partial | `names()`: Use an array of names as string |
| `phone_number` | ✅ Mutable | `string()`: Use the string version of the phone number (same as rawWithDefault with default value '') |
| `relation` | ✅ Mutable | `ids()`: Use an array of IDs of page references<br/>`singleId()`: Use only the first ID, infers to a single string type<br/>`objects()`: Construct objects from relations using related rollup fields |
| `rollup` | ❌ Immutable | `dateRange()`: Same as dateRange for date type<br/>`numberDefaultZero()`: Same as numberDefaultZero for formula type<br/>`handleSingleUsing()`: Handle the first array item with a custom handler<br/>`handleArrayUsing()`: Handle the full array with a custom handler |
| `rich_text` | ✅ Mutable | `plainText()`: Use the plain text version of the field |
| `select` | ✅ Mutable | `optionalString()`: Use name of selected option or undefined<br/>`stringEnum()`: Allow only names in the list |
| `status` | ✅ Mutable | `string()`: Use name of selected status<br/>`stringEnum()`: Allow only names in the list |
| `title` | ✅ Mutable | `plainText()`: Use plaintext version of the title |
| `url` | ✅ Mutable | `string()`: Use the string version of the URL (same as rawWithDefault with default value '') |
| `unique_id` | ❌ Immutable | `number()`: Use only the number part of the field<br/>`stringWithPrefix()`: Use concatenated string with prefix, same as the one shown in Notion |
| `verification` | ❌ Immutable | Supports only default conversions |

### Default Conversions

All types include the following default conversions:

- `raw()`: Use the native Notion page property type returned by Notion API
- `rawWithDefault(value)`: Same as `raw` except making the inferred type non-nullable by accepting a default value
- `handleUsing(handler)`: Convert the value using a supplied handling function (will make mutable types immutable since composer is not provided)
- `handleAndComposeUsing({ handler, composer })`: (Only for mutable types) Convert the value using a supplied handling function and convert the value back to Notion type using a supplied compose function

## Type Utilities

| Utility | Description |
|---------|-------------|
| `DBInfer<T>` | Pass it the type of the schema of a DB to infer converted types for the DB |
| `DBObjectTypesInfer<T>` | Pass it the type of the whole schema to infer converted types for all DBs |
| `DBMutateInfer<T>` | Pass it the type of schema of a DB to infer viable input type for creating/updating records in the DB |
| `DBMutateObjectTypesInfer<T>` | Pass it the type of the whole schema to infer viable input types for creating/updating records in all DBs |

## Helper Functions

The library also exports some helper functions:

```typescript
import { packPlainText, convertNotionImage } from 'notion-cms-adaptor';

// Convert rich text items to plain text
const plainText = packPlainText(richTextItems);

// Convert a Notion image URL to use Notion's image optimization
const optimizedUrl = convertNotionImage(pageId, preSignedUrl);
```

## Development

To develop based on this project, clone this repository and run:

```bash
bun install
```

To run tests:

```bash
bun run test
```

To build the project:

```bash
bun run build
```

## License

MIT
