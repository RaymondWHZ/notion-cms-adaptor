# CLAUDE.md

This file provides guidance for Claude Code instances working on this project.

## Project Overview

**notion-cms-adaptor** is a type-safe TypeScript library that wraps the official Notion SDK to use Notion databases as a headless CMS. It provides schema definitions with automatic type inference, property value conversion, and convenient query/mutation functions.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Testing**: Bun test
- **Build**: Bun build (outputs to `dist/`)
- **Dependencies**: `@notionhq/client` (official Notion SDK)

## Key Commands

```bash
bun install      # Install dependencies
bun run test     # Run tests
bun run build    # Build to dist/
```

## Architecture

### Core Files

- `src/types.ts` - Core type definitions (PropertyDef, MutPropertyDef, value types, handlers, composers)
- `src/schema.ts` - Schema definition functions (checkbox, title, rich_text, etc.) and their default interfaces
- `src/client.ts` - Client factory and query/mutation functions (createNotionDBClient)
- `src/index.ts` - Public exports

### Key Concepts

1. **PropertyDef<T, R>** - Immutable property definition with:
   - `type`: Notion property type
   - `propertyName?`: Optional custom Notion property name (defaults to TS key)
   - `handler`: Converts Notion value to user type

2. **MutPropertyDef<T, R, I>** - Mutable property extending PropertyDef with:
   - `composer`: Converts user input back to Notion format

3. **Schema Functions** - Factory functions like `checkbox()`, `title()`, `rich_text()` that return default property definitions with convenience methods:
   - `raw()` - Return raw Notion value
   - `rawWithDefault(value)` - Return raw with default
   - `handleUsing(handler)` - Custom handler
   - `handleAndComposeUsing({handler, composer})` - Custom handler + composer (mutable only)

4. **Custom Property Names** - All schema functions accept optional `propertyName` parameter:
   ```typescript
   isDone: checkbox("Done").boolean()  // TS key: isDone, Notion property: Done
   ```

5. **Metadata** - `metadata(key)` function auto-detects mutability:
   - Mutable: `icon`, `cover`, `in_trash`
   - Immutable: all others (`id`, `created_time`, etc.)

### Type Flow

```
Notion API Response
    ↓ (handler)
User Type (R) ← PropertyDef<T, R>
    ↓ (composer)
Notion API Request ← MutPropertyDef<T, R, I>
```

### Client Functions

- **Queries**: `query`, `queryFirst`, `queryOneById`, `queryOneByUniqueId`, `queryKV`, `queryText`
- **Mutations**: `insertEntry`, `updateEntry`, `deleteEntry`

## Code Patterns

### Adding a New Property Type

1. Create interface extending `DefaultPropertyDef` or `DefaultMutPropertyDef`
2. Create factory function with explicit return type
3. Spread `makeDefaultOptions` or `makeMutableDefaultOptions`
4. Add convenience methods

Example:
```typescript
export interface DefaultFooDef extends DefaultMutPropertyDef<"foo"> {
  customMethod(): MutPropertyDef<"foo", string>;
}

export function foo(propertyName?: string): DefaultFooDef {
  return {
    ...makeMutableDefaultOptions("foo", propertyName),
    customMethod() {
      return this.handleAndComposeUsing({
        handler: (value) => /* convert */,
        composer: (value) => /* convert back */,
      });
    },
  };
}
```

### Return Type Annotations

All property functions must have explicit return type annotations to help TypeScript server performance and avoid memory leaks with complex inferred types.

## Testing

Tests are in `test/client.test.ts`. They mock the Notion client and verify:
- Query processing and type conversion
- Insert/update with proper property composition
- Custom property name mapping

## Common Gotchas

1. **Generic methods** like `stringEnums<T>()` need explicit return type annotations in implementations
2. **Property name vs propertyName**: Function parameter is `propertyName`, stored as `propertyName` in the def object
3. **Metadata keys**: The `__` prefix is internal (e.g., `__id`, `__created_time`) - users use `metadata("id")`
