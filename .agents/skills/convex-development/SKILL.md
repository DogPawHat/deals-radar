---
name: convex-development
description: Develops Convex backend code including schema design, queries, mutations, actions, and indexes. Use when working with convex/ directory, database schema, or serverless functions.
---

# Convex Development

Guidelines for developing Convex backend code with correct patterns and best practices.

## Function Syntax

Always use the new function syntax with explicit args and return validators:

```ts
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { userId: v.id("users") },
  returns: v.object({ name: v.string() }),
  handler: async (ctx, args) => {
    // Function body
  },
});
```

## Schema Design

### Define Schema in `convex/schema.ts`

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }).index("by_email", ["email"]),
});
```

### System Fields
- `_id` and `_creationTime` are auto-generated—never redefine them
- Use `v.id("tableName")` for foreign key references

### Validators Reference
| Type | Validator |
|------|-----------|
| String | `v.string()` |
| Number | `v.number()` |
| Boolean | `v.boolean()` |
| ID Reference | `v.id("tableName")` |
| Optional | `v.optional(v.string())` |
| Array | `v.array(v.string())` |
| Object | `v.object({ key: v.string() })` |
| Union | `v.union(v.string(), v.number())` |
| Literal | `v.literal("value")` |
| Record | `v.record(v.string(), v.number())` |
| Any | `v.any()` |
| Null | `v.null()` |
| Int64 | `v.int64()` |

### Index Design
- Define indexes for fields used in query filters
- Avoid redundant indexes (e.g., `by_foo` + `by_foo_and_bar` → just use `by_foo_and_bar`)
- Compound indexes support prefix queries

```ts
defineTable({ teamId: v.id("teams"), userId: v.id("users") })
  .index("by_team_user", ["teamId", "userId"]) // Supports queries on teamId alone or teamId + userId
```

## Queries

### Use Indexes, Not `.filter()`

```ts
// ❌ Bad - scans all documents
const messages = await ctx.db
  .query("messages")
  .filter((q) => q.eq(q.field("author"), "Tom"))
  .collect();

// ✅ Good - uses index
const messages = await ctx.db
  .query("messages")
  .withIndex("by_author", (q) => q.eq("author", "Tom"))
  .collect();

// ✅ Also good - filter in TypeScript for small datasets
const allMessages = await ctx.db.query("messages").collect();
const filtered = allMessages.filter((m) => m.author === "Tom");
```

### Limit Results with `.collect()`

Only use `.collect()` when you expect a small number of results (<1000).

```ts
// ❌ Bad - unbounded results
const allMovies = await ctx.db.query("movies").collect();

// ✅ Good - use pagination or limits
const movies = await ctx.db
  .query("movies")
  .withIndex("by_director", (q) => q.eq("director", "Spielberg"))
  .take(50);

// ✅ Good - paginate
const movies = await ctx.db
  .query("movies")
  .paginate(paginationOpts);
```

### Query Methods
- `.unique()` - Returns single document, throws if multiple match
- `.first()` - Returns first document or null
- `.take(n)` - Returns up to n documents
- `.collect()` - Returns all matching documents (use carefully)
- `.paginate(opts)` - Returns paginated results

## Mutations

### Always Await Database Operations

```ts
// ❌ Bad - floating promise
ctx.db.insert("messages", { body: "hello" });

// ✅ Good - awaited
await ctx.db.insert("messages", { body: "hello" });
```

### CRUD Operations

```ts
// Create
const id = await ctx.db.insert("messages", { body: "hello" });

// Read
const doc = await ctx.db.get(id);

// Update (partial)
await ctx.db.patch(id, { body: "updated" });

// Update (full replace)
await ctx.db.replace(id, { body: "replaced", author: "me" });

// Delete
await ctx.db.delete(id);
```

## Actions

Actions can call external APIs and run non-deterministic code.

### Explicit Return Types (Required)

**Always add explicit return type annotations to action handlers** to avoid circular type inference errors. TypeScript can struggle with inferring return types when actions call `ctx.runQuery` or `ctx.runMutation`.

```ts
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type FetchResult = { data: string; timestamp: number };

export const fetchData = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<FetchResult> => {
    const response = await fetch(args.url);
    const data = await response.json();
    
    await ctx.runMutation(internal.data.store, { data });
    
    return { data, timestamp: Date.now() };
  },
});

// For actions returning void/null
export const processItem = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args): Promise<null> => {
    await ctx.runMutation(internal.items.process, { id: args.itemId });
    return null;
  },
});
```

### Why Explicit Return Types?

Without explicit return types, TypeScript may produce circular type inference errors like:
- `'startExtract' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions.`

This happens because Convex's generated `api` and `internal` objects reference your function, creating a circular dependency that TypeScript can't resolve without your help.

### Node.js Actions

Add `"use node";` at the top of files using Node.js built-in modules:

```ts
"use node";

import { action } from "./_generated/server";
import crypto from "crypto";

export const hashData = action({
  args: { data: v.string() },
  handler: async (ctx, args) => {
    return crypto.createHash("sha256").update(args.data).digest("hex");
  },
});
```

## Internal vs Public Functions

```ts
// Public - callable from client
import { query, mutation, action } from "./_generated/server";

// Internal - only callable from other Convex functions
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
```

### API References

```ts
import { api, internal } from "./_generated/api";

// Call public function
await ctx.scheduler.runAfter(0, api.messages.send, { body: "hello" });

// Call internal function (preferred for server-to-server)
await ctx.runMutation(internal.messages.store, { body: "hello" });
```

## Scheduling

```ts
// Schedule after delay (ms)
await ctx.scheduler.runAfter(1000, internal.tasks.process, { id });

// Schedule at specific time
await ctx.scheduler.runAt(timestamp, internal.tasks.process, { id });
```

## Cron Jobs

Define in `convex/crons.ts`:

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup", { hours: 1 }, internal.tasks.cleanup, {});

crons.daily("report", { hourUTC: 9, minuteUTC: 0 }, internal.reports.generate, {});

export default crons;
```

## Helper Functions

Extract shared logic into plain TypeScript functions:

```ts
import { QueryCtx, MutationCtx } from "./_generated/server";

// Helper function
async function getUser(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user;
}

// Use in query
export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await getUser(ctx, args.userId);
  },
});
```

## TypeScript Types

```ts
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

// Document type
type User = Doc<"users">;

// ID type
type UserId = Id<"users">;

// Context types for helpers
async function myHelper(ctx: QueryCtx) { ... }
```

## Best Practices Checklist

- [ ] Await all promises (`await ctx.db.insert`, `await ctx.scheduler.runAfter`)
- [ ] Use indexes with `.withIndex()` instead of `.filter()`
- [ ] Limit `.collect()` to small result sets
- [ ] Use `internal.*` for server-to-server calls, not `api.*`
- [ ] Add argument validators to all public functions
- [ ] Use `v.id("tableName")` for ID arguments, not `v.string()`
- [ ] Extract shared logic into helper functions
- [ ] Add `"use node";` directive for Node.js built-ins
- [ ] **Add explicit return types to all action handlers** (e.g., `: Promise<MyType>`)

## File Organization

```
convex/
├── _generated/          # Auto-generated (don't edit)
├── schema.ts           # Database schema
├── types.ts            # Shared TypeScript types
├── crons.ts            # Cron job definitions
├── http.ts             # HTTP endpoints
├── [resource].ts       # Functions per resource (e.g., users.ts, deals.ts)
└── model/              # Optional: helper functions organized by domain
    └── users.ts
```

## Common Patterns

### Upsert Pattern

```ts
export const upsert = mutation({
  args: { externalId: v.string(), data: v.object({ ... }) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("items")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    
    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return existing._id;
    }
    return await ctx.db.insert("items", { externalId: args.externalId, ...args.data });
  },
});
```

### Soft Delete Pattern

```ts
// Schema
defineTable({
  ...fields,
  deletedAt: v.optional(v.number()),
}).index("by_active", ["deletedAt"])

// Query active only
const active = await ctx.db
  .query("items")
  .withIndex("by_active", (q) => q.eq("deletedAt", undefined))
  .collect();
```
