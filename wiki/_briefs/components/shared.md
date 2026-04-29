## Brief: components/shared.md

Focus: The `shared` application — entry points, public surface, main flows.

Files to read first:
- `packages/shared/package.json`

- `packages/shared/src/index.ts`


Package snapshot:
```json
{
  "name": "@ps/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./src/index.ts"
    },
    "./types": {
      "import": "./dist/types.js",
      "types": "./src/types.ts"
    },
    "./constants": {
      "import": "./dist/constants.js",
      "types": "./src/constants.ts"
    },
    "./validation": {
      "import": "./dist/validation.js",
      "types": "./src/validation.ts"
    },
    "./crypto": {
      "import": "./dist/crypto.js",
      "types": "./src/crypto.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest
```



GitNexus queries:
- `gitnexus_cypher` with `MATCH (f:File) WHERE f.path STARTS WITH "packages/shared/" RETURN f.path LIMIT 30`
- `gitnexus_query` with "main flow in shared"

Target: 10-15 KB with a sequence diagram + Public API table.
