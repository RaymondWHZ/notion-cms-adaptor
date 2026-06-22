# Notion CMS Adaptor

Type-safe Notion database toolbox for using Notion as a headless CMS.

```typescript
const schema = createDBSchemas({
  posts: {
    _id: metadata("id"),
    title: title().plainText(),
    tags: multi_select().stringEnums('tech', 'life'),
    status: status().stringEnum('draft', 'published'),
  },
});

const posts = await client.query('posts');
// posts: { _id: string, title: string, tags: ('tech' | 'life')[], status: 'draft' | 'published' }[]
```

## Features

- **Type-safe** - Define schemas, get full TypeScript inference
- **Auto-discovery** - Reference databases by name, not IDs
- **Flexible** - Pre-defined converters with custom handler support
- **Mutations** - Type-safe insert, update, and delete
- **Minimal** - Thin wrapper around official Notion SDK

## Installation

```bash
npm install notion-cms-adaptor
```

## Documentation

See the [full documentation](https://raymondwhz.github.io/notion-cms-adaptor/) for guides and API reference.

## Development

```bash
bun install
bun test
bun build
```

## License

MIT
