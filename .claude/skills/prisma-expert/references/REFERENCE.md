# Prisma ORM Reference Documentation

> Source: Context7 — `/prisma/docs`
> Generated: 2026-03-11

---

## Schema Design & Models

### Defining Models

Each model maps to a database table. Models support relationships, field attributes, and database constraints.

```prisma
model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User?   @relation(fields: [authorId], references: [id])
  authorId  Int?
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}
```

### Common Field Attributes

| Attribute | Description |
|-----------|-------------|
| `@id` | Primary key |
| `@default(autoincrement())` | Auto-incrementing integer |
| `@default(uuid())` | UUID default |
| `@default(cuid())` | CUID default |
| `@default(now())` | Current timestamp |
| `@unique` | Unique constraint |
| `@relation(fields: [...], references: [...])` | Foreign key relation |
| `@map("column_name")` | Map to different column name |
| `@@map("table_name")` | Map model to different table name |
| `@@index([field1, field2])` | Composite index |
| `@@unique([field1, field2])` | Composite unique constraint |

---

## Queries

### findMany with include and select

```typescript
const usersWithPartialPosts = await prisma.user.findMany({
  include: {
    posts: {
      select: {
        title: true,
        published: true,
      },
    },
  },
});
```

Result type:
```typescript
const usersWithPartialPosts: (User & {
  posts: {
    title: string
    published: boolean
  }[]
})[]
```

### Complex Nested Query (vs Raw SQL)

```typescript
// Prisma: readable and maintainable
const posts = await prisma.post.findMany({
  where: { published: true },
  include: {
    author: {
      select: { name: true, email: true }
    },
    comments: {
      where: { approved: true },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }
  }
});
```

### N+1 Problem Solution with include

```typescript
// Two SQL queries instead of N+1
const usersWithPosts = await prisma.user.findMany({
  include: {
    posts: true,
  },
});
```

Generated SQL:
```sql
SELECT "public"."User"."id", "public"."User"."email", "public"."User"."name" FROM "public"."User" WHERE 1=1 OFFSET $1
SELECT "public"."Post"."id", "public"."Post"."title", "public"."Post"."authorId" FROM "public"."Post" WHERE "public"."Post"."authorId" IN ($1,$2,$3,$4) OFFSET $5
```

### orderBy (including related fields and nulls)

```typescript
// Sort by own field
const usersAsc = await prisma.user.findMany({
  orderBy: { email: "asc" },
});

// Sort by related field
const posts = await prisma.post.findMany({
  orderBy: {
    author: { name: "asc" },
  },
});

// Sort with nulls first
const posts = await prisma.post.findMany({
  orderBy: {
    author: {
      name: { sort: "asc", nulls: "first" },
    },
  },
});
```

---

## Batch Operations

```typescript
// Create many
await prisma.user.createMany({
  data: [
    { email: 'alice@prisma.io' },
    { email: 'bob@prisma.io' }
  ]
});

// Update many
await prisma.post.updateMany({
  where: { published: false },
  data: { published: true }
});
```

---

## Transactions

### Sequential Transaction (Array)

```typescript
const [deletedUsers, createdPosts] = await prisma.$transaction([
  prisma.user.deleteMany({ where: { name: "John Doe" } }),
  prisma.post.createMany({ data }),
]);
```

### Interactive Transaction (Callback)

```typescript
async function transfer(from: string, to: string, amount: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Decrement amount from the sender.
    const sender = await tx.account.update({
      data: {
        balance: { decrement: amount },
      },
      where: { email: from },
    });

    // 2. Verify that the sender's balance didn't go below zero.
    if (sender.balance < 0) {
      throw new Error(`${from} doesn't have enough to send ${amount}`);
    }

    // 3. Increment the recipient's balance by amount
    const recipient = tx.account.update({
      data: {
        balance: { increment: amount },
      },
      where: { email: to },
    });

    return recipient;
  });
}
```

### Transaction with Isolation Level and Retry

```typescript
import { Prisma, PrismaClient } from "../prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const MAX_RETRIES = 5;
  let retries = 0;
  let result;

  while (retries < MAX_RETRIES) {
    try {
      result = await prisma.$transaction(
        [
          prisma.user.deleteMany({ where: { /** args */ } }),
          prisma.post.createMany({ data: { /** args */ } })
        ],
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );
      break;
    } catch (error) {
      if (error.code === "P2034") {
        retries++;
        continue;
      }
      throw error;
    }
  }
}
```

---

## Raw SQL

### Safe Parameterized Queries

```typescript
// Query with tagged template (safe from SQL injection)
const users = await prisma.$queryRaw`SELECT * FROM "User" WHERE role = 'ADMIN'`

// Query with parameters (safe)
const email = 'alice@prisma.io'
const user = await prisma.$queryRaw`SELECT * FROM "User" WHERE email = ${email}`

// Typed raw query
import { User } from './generated/client'
const typedUsers = await prisma.$queryRaw<User[]>`SELECT * FROM "User"`

// Execute raw (returns affected row count)
const result = await prisma.$executeRaw`
  UPDATE "User" SET "role" = 'ADMIN' WHERE "email" LIKE '%@prisma.io'
`
// Returns: 5 (number of affected rows)
```

### Dynamic Queries with Prisma.sql

```typescript
import { Prisma } from './generated/client'

// IN clause with array
const ids = [1, 3, 5, 10]
const usersById = await prisma.$queryRaw`
  SELECT * FROM "User" WHERE id IN (${Prisma.join(ids)})
`

// Conditional query parts
const searchName = 'Alice'
const conditionalQuery = await prisma.$queryRaw`
  SELECT * FROM "User"
  ${searchName ? Prisma.sql`WHERE name = ${searchName}` : Prisma.empty}
`

// Raw query with transaction
const [users, posts] = await prisma.$transaction([
  prisma.$queryRaw`SELECT * FROM "User"`,
  prisma.$queryRaw`SELECT * FROM "Post" WHERE published = true`,
])
```

### Unsafe Raw Queries (Use with Caution)

```typescript
// Only use when absolutely necessary with trusted input
const tableName = 'User'
const unsafeQuery = await prisma.$queryRawUnsafe(
  `SELECT * FROM "${tableName}" WHERE id = $1`,
  1
)

// PostgreSQL parameterized query
const parameterized = await prisma.$queryRawUnsafe(
  'SELECT * FROM "User" WHERE email = $1 AND role = $2',
  'alice@prisma.io',
  'ADMIN'
)
```

### Raw SQL for Extension Types (e.g., pgvector)

```typescript
await prisma.$executeRaw`
  INSERT INTO "Document" (title, embedding)
  VALUES ('My Title', '[1,22,1,42]'::vector)
`;
```

---

## Client Extensions

### Extending Raw Query Operations

```typescript
const prisma = new PrismaClient().$extends({
  query: {
    $queryRaw({ args, query, operation }) {
      // handle $queryRaw operation
      return query(args);
    },
    $executeRaw({ args, query, operation }) {
      // handle $executeRaw operation
      return query(args);
    },
    $queryRawUnsafe({ args, query, operation }) {
      // handle $queryRawUnsafe operation
      return query(args);
    },
    $executeRawUnsafe({ args, query, operation }) {
      // handle $executeRawUnsafe operation
      return query(args);
    },
  },
});
```

---

## Error Handling

### Error Type Checking with Specific Error Codes

```typescript
import { PrismaClient, Prisma } from './generated/client'

const prisma = new PrismaClient()

async function createUser(email: string, name: string) {
  try {
    const user = await prisma.user.create({
      data: { email, name },
    })
    return user
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      switch (e.code) {
        case 'P2002':
          // Unique constraint violation
          console.log(`User with email ${email} already exists`)
          break
        case 'P2025':
          // Record not found
          console.log('Record not found')
          break
        case 'P2003':
          // Foreign key constraint failed
          console.log('Related record not found')
          break
        case 'P2034':
          // Transaction conflict (for retry logic)
          console.log('Transaction conflict, retry needed')
          break
        default:
          console.log(`Database error: ${e.code}`)
      }
    } else if (e instanceof Prisma.PrismaClientValidationError) {
      // Invalid query structure
      console.log('Invalid query:', e.message)
    } else if (e instanceof Prisma.PrismaClientInitializationError) {
      // Connection issues
      console.log('Failed to connect to database')
    }
    throw e
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `P2000` | Value too long for column type |
| `P2001` | Record not found (where condition) |
| `P2002` | Unique constraint violation |
| `P2003` | Foreign key constraint failed |
| `P2005` | Invalid field value |
| `P2014` | Relation violation |
| `P2015` | Related record not found |
| `P2025` | Record not found (update/delete) |
| `P2034` | Transaction write conflict / deadlock |

---

## Best Practices

### Query Optimization

1. **Use `select` to fetch only needed fields** — reduces data transfer
2. **Use `include` instead of separate queries** — solves N+1 problem
3. **Batch operations** (`createMany`, `updateMany`, `deleteMany`) — atomic, efficient
4. **Use transactions** for multi-step operations requiring consistency
5. **Use raw SQL** for complex analytical queries that Prisma Client cannot express efficiently

### Connection Pooling

Configure via the `DATABASE_URL` connection string:
```
postgresql://user:password@host:5432/db?connection_limit=10&pool_timeout=10
```

### Migration Workflow

```bash
# Development: create and apply migration
npx prisma migrate dev --name add_user_table

# Production: apply pending migrations
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate

# Reset database (development only)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```
