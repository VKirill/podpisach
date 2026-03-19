# Backend Security — FeedGen Project-Specific Reference

> Source: Project code analysis | Project: FeedGen | Generated: 2026-03-16

## Ownership Verification Pattern (CRITICAL)

Every mutating API route MUST verify resource ownership before performing operations.
The project uses `owner_key` (UUID) as the logical ownership identifier.

```typescript
// src/lib/owner-key.ts — central ownership module
import { getOwnerKey, verifyFeedOwner, verifyTemplateOwner } from "@/lib/owner-key";

// Standard pattern for ALL mutating API routes:
export async function POST(request: NextRequest) {
  const ownerKey = await getOwnerKey(); // session → cookie → generate new
  const { feed_id } = await request.json();

  // ALWAYS verify before mutation
  if (!(await verifyFeedOwner(feed_id, ownerKey))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Safe to proceed with mutation
  await query("UPDATE feeds SET ... WHERE id = $1 AND owner_key = $2", [feed_id, ownerKey]);
}
```

### Ownership chain: session → cookie → anonymous

```typescript
// getOwnerKey() resolution order:
// 1. Authenticated session (fg_session cookie → auth_sessions → users.owner_key)
// 2. Anonymous cookie (fg_owner_key)
// 3. Generate new UUID (last resort)

// Cookie security settings:
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
  path: "/",
  sameSite: process.env.CORS_ORIGIN ? "none" : "lax",
}
```

### Multi-resource verification (parallel)

```typescript
// When route touches multiple resources — verify ALL in parallel
const [feedOk, templateOk] = await Promise.all([
  verifyFeedOwner(feed_id, ownerKey),
  verifyTemplateOwner(template_id, ownerKey),
]);
if (!feedOk || !templateOk) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

## SQL Injection Prevention

The project uses raw `pg` (no ORM). ALL queries MUST use parameterized placeholders `$1, $2, ...`.

```typescript
import { query, transaction } from "@/lib/db";

// CORRECT — parameterized query
const result = await query(
  "SELECT * FROM feeds WHERE id = $1 AND owner_key = $2",
  [feedId, ownerKey]
);

// CORRECT — transaction with parameterized queries
await transaction(async (client) => {
  const user = await client.query(
    `INSERT INTO users (name, email, owner_key) VALUES ($1, $2, $3) RETURNING *`,
    [name, email, ownerKey]
  );
  await client.query(
    "INSERT INTO auth_accounts (user_id, provider, provider_account_id) VALUES ($1, $2, $3)",
    [user.rows[0].id, provider, providerAccountId]
  );
});

// NEVER — string concatenation (SQL injection vector)
// await query(`SELECT * FROM feeds WHERE id = '${feedId}'`);

// NEVER — template literals without parameterization
// await query(`UPDATE feeds SET name = '${name}' WHERE id = '${id}'`);
```

### Dynamic table names (mergeAnonymousData pattern)

```typescript
// When table name is dynamic, use allowlist validation
const ALLOWED_TABLES = ["feeds", "templates", "generation_jobs", "brand_assets", "gen_scenarios", "gen_runs"];

for (const table of ALLOWED_TABLES) {
  // Table name from hardcoded list — safe for interpolation
  // Values ALWAYS parameterized
  await query(
    `UPDATE ${table} SET owner_key = $1 WHERE owner_key = $2`,
    [newOwnerKey, oldOwnerKey]
  );
}
```

## Authentication: OAuth + Session + HMAC

### Session cookie security

```typescript
// Session cookie settings (src/lib/auth.ts)
export function sessionCookieOptions() {
  return {
    name: "fg_session",
    httpOnly: true,                              // No JS access
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    maxAge: 60 * 60 * 24 * 30,                   // 30 days
    path: "/",
    sameSite: "lax" as const,                     // CSRF protection
  };
}
```

### Telegram HMAC-SHA256 verification

```typescript
import { createHmac } from "crypto";

export function verifyTelegramAuth(data: TelegramAuthData): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  // Reject stale auth data (5 min window)
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > 300) return false;

  // HMAC-SHA256 verification per Telegram spec
  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key as keyof typeof rest]}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = createHmac("sha256", secretKey).update(checkString).digest("hex");

  return hmac === hash; // Timing-safe comparison recommended for production
}
```

### Session cleanup on invalid/expired

```typescript
// getSession() auto-cleans expired sessions
if (result.rows.length === 0) {
  cookieStore.delete(SESSION_COOKIE);
  // Background cleanup of all expired sessions
  await query("DELETE FROM auth_sessions WHERE expires_at < now()").catch(console.error);
  return null;
}
```

## CORS Configuration (Next.js Middleware)

```typescript
// src/middleware.ts — CORS with environment-aware origin
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "https://feedgen.ru";

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",  // Required for cookie auth
    "Access-Control-Max-Age": "86400",
  };

  // Dev: allow any origin. Prod: strict allowlist
  if (process.env.NODE_ENV !== "production") {
    headers["Access-Control-Allow-Origin"] = origin || "*";
  } else if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  }
  // If origin doesn't match in prod — no Access-Control-Allow-Origin header = browser blocks

  return headers;
}

// Preflight handling
if (request.method === "OPTIONS") {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// API cache prevention (CDN must not cache authenticated responses)
if (request.nextUrl.pathname.startsWith("/api/")) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
}
```

### Middleware matcher — scope CORS to specific paths only

```typescript
export const config = {
  matcher: ["/api/:path*", "/uploads/:path*", "/generated/:path*"],
};
```

## S3 Path Traversal Prevention

All S3 keys MUST be scoped to `users/{ownerKey}/`. This prevents cross-user data access.

```typescript
// CORRECT — scoped S3 key
const s3Key = `users/${ownerKey}/feeds/${feedId}/nobg/${hash}.webp`;
await uploadFile(s3Key, buffer, "image/webp");

// CORRECT — prefix-scoped deletion
await deletePrefix(`users/${ownerKey}/feeds/${feedId}/`);

// NEVER — user-controlled path segments without validation
// const s3Key = `users/${userInput}/...`; // userInput could be "../admin"
```

### S3 key construction rules

```typescript
// All keys follow strict pattern: users/{ownerKey}/{resource_type}/{resource_id}/...
// ownerKey is UUID (from getOwnerKey()) — safe for path construction
// feedId, templateId — validated via verifyFeedOwner/verifyTemplateOwner before use

const prefix = `users/${ownerKey}/feeds/${feedId}`;
// Sub-paths:
// ${prefix}/offers/${offerId}/${field}.webp   — AI-generated images
// ${prefix}/nobg/${hash}.webp                  — Background-removed images
// ${prefix}/export/                            — Exported archives
```

## XML Security (XXE Prevention)

```typescript
import { XMLParser } from "fast-xml-parser";

// fast-xml-parser v5 is safe by default — no DTD/entity expansion
// But explicitly configure for safety:
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // No processEntities option needed — v5 doesn't expand external entities
});

// Output escaping for generated XML
import { escapeXml } from "@/lib/xml-utils";

// ALL user-controlled values MUST be escaped in XML output
lines.push(`<name>${escapeXml(String(meta.name))}</name>`);
lines.push(`<url>${escapeXml(shopUrl)}</url>`);
lines.push(`<category id="${escapeXml(cat.external_id)}">${escapeXml(cat.name)}</category>`);
```

## API Route Security Checklist

Standard pattern for every Next.js App Router API route in this project:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOwnerKey, verifyFeedOwner } from "@/lib/owner-key";

export async function POST(request: NextRequest) {
  // 1. Get owner identity
  const ownerKey = await getOwnerKey();

  // 2. Parse and validate input
  const body = await request.json();
  const { feed_id, name } = body;
  if (!feed_id || typeof feed_id !== "string") {
    return NextResponse.json({ error: "feed_id required" }, { status: 400 });
  }

  // 3. Verify ownership BEFORE any mutation
  if (!(await verifyFeedOwner(feed_id, ownerKey))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Parameterized SQL only
  const result = await query(
    "INSERT INTO ... VALUES ($1, $2, $3) RETURNING *",
    [feed_id, ownerKey, name]
  );

  // 5. Return minimal data (no internal IDs/secrets)
  return NextResponse.json({ id: result.rows[0].id });
}
```

## Error Handling (No Information Leakage)

```typescript
// CORRECT — generic error to client, detailed log to server
try {
  await query("INSERT INTO ...", [values]);
} catch (err) {
  console.error("[api/feeds] insert failed:", err);
  return NextResponse.json(
    { error: "Failed to create feed" },  // Generic message
    { status: 500 }
  );
}

// NEVER — expose raw error details
// return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });

// Background operations — catch and log, don't crash
await query("DELETE FROM auth_sessions WHERE expires_at < now()")
  .catch((err) => console.error("[auth] cleanup expired sessions failed:", err));
```

## Anonymous → Authenticated Migration

Secure data merging when anonymous user authenticates:

```typescript
export async function handleLogin(opts: CreateUserOpts) {
  const cookieStore = await cookies();
  const anonymousKey = cookieStore.get("fg_owner_key")?.value;

  const user = await findOrCreateUser(opts);

  // Migrate anonymous data to authenticated user
  if (anonymousKey && anonymousKey !== user.owner_key) {
    await mergeAnonymousData(anonymousKey, user.owner_key);
  }

  const sessionId = await createSessionRecord(user.id);
  return { user, sessionId };
}

// Security consideration: mergeAnonymousData uses hardcoded table list
// to prevent injection via dynamic table names
```

## Security Headers Recommendations (Not Yet Implemented)

Missing headers to consider adding to middleware:

```typescript
// Recommended additions to middleware.ts
response.headers.set("X-Content-Type-Options", "nosniff");
response.headers.set("X-Frame-Options", "DENY");
response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
// CSP — configure based on CDN/script sources used by the app
```
