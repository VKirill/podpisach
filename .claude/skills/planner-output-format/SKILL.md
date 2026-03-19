---
name: planner-output-format
description: YAML frontmatter + markdown output format for planner agent. Defines structure, rules, and examples for plan generation.
user-invocable: false
references: references/REFERENCE.md
scripts: scripts/validate-plan.sh
---

# Planner Output Format: YAML Frontmatter + Markdown

## Format Rules

Response = YAML frontmatter (between `---`) + markdown body.

**CRITICAL:**
- FIRST character = `---`. No exceptions.
- FORBIDDEN: any text before first `---`. No "I'll output...", no summary, no investigation results. Immediately `---`.
- All text including investigation conclusions goes AFTER second `---` in markdown body.

**CRITICAL — planner role:**
- Planner describes WHAT to do and WHY, but NEVER writes code.
- DO NOT insert "Current code → Replace with" blocks. Coder decides HOW to implement.
- In Implementation Steps: specify file, function/method, what should change (behavior), constraints.
- CORRECT: "In load_data() extend fallback condition to cover min_frequency > 0 case. Currently fallback triggers only for freq_filter != all."
- WRONG: "Replace lines 71-80: ```python\nif not rows and has_filter:...```"

## YAML Frontmatter Structure

```yaml
---
name: Short plan name (3-7 words)
overview: What we're doing and why (1-2 sentences)
todos:
  - id: kebab-case-id
    content: Short checkpoint — what to verify/do (1 line)
    verify_steps:
      - "New function exists and is exported"
      - "TypeScript compiles without errors"
    status: pending
  - id: another-step
    content: Next checkpoint
    verify_steps:
      - "Integration point calls new function"
    status: pending
  - id: verify
    content: Build and tests pass
    verify_steps:
      - "Project build command passes"
      - "All existing tests pass"
    status: pending
isProject: false
---
```

## Todo Rules

- `id` — unique kebab-case identifier
- `content` — SHORT checkpoint (1 line, max 100 chars). What to verify, not HOW to do it
- `verify_steps` — list of 1-3 concrete verification criteria (what the verifier will check). Each item = one testable assertion. Examples: "Function X exported from Y", "Build passes", "API returns 200"
- `status` — always `pending`
- DO NOT include in todos: code snippets, detailed instructions, file paths — all of that goes in markdown body
- Todos = progress checklist, NOT detailed tasks

## Questions Format

If questions for the client — add to frontmatter:
```yaml
has_questions: true
questions:
  - Question in simple language
```

## Markdown Body (after second `---`)

ALL detailed information goes in markdown body:

1. **Architecture** — diagrams (Mermaid), interaction schemas
2. **Investigation Results** — what was found in code (symbols, patterns, dependencies)
3. **Approach Selection** — approaches table, selected variant, trade-offs
4. **Implementation Steps** — detailed steps with files, code, what to change, where, why
5. **Files Summary** — files table (new/modified, ~lines)
6. **Risks & Rollback** — risks, rollback plan
7. **Agents & Review** — who does what, in what order
8. **Validation** — completeness check (build, tests)

## Full Example

```
---
name: Pinterest auto-publish integration
overview: Auto-publish restored photos to Pinterest after processing, fire-and-forget approach
todos:
  - id: env-config
    content: Add PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID to env schema
    status: pending
  - id: pinterest-client
    content: Create PinterestClient with uploadPin() method
    status: pending
  - id: integrate-service
    content: Integrate Pinterest publishing into processRestoration() (fire-and-forget)
    status: pending
  - id: verify
    content: Run lint, typecheck, tests
    status: pending
isProject: false
---

# Pinterest Auto-publish Integration

## Architecture

(Mermaid diagram here)

## Investigation Results

- `processRestoration()` — main method, add Pinterest step after sendPhoto()
- `LaoZhangClient` — API client pattern for reference

## Approach Selection

| Approach | Pros | Cons |
|----------|------|------|
| **C: Fire-and-forget** | **Simplicity + isolation** | No retry |

## Implementation Steps

### Step 1: Environment Variables
File: `src/shared/config/env.ts`
Add to envSchema: PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID as optional strings

### Step 2: Pinterest API Client
New file: `src/shared/lib/pinterest/client.ts`
Based on `src/shared/lib/laozhang/client.ts` pattern
...

## Files Summary

| File | Action | ~Lines |
|------|--------|--------|
| env.ts | MOD | +3 |
| pinterest/client.ts | NEW | ~80 |

## Risks & Rollback

- Token expiry — MVP: manual refresh
- Rollback: remove uploadToPinterest() call
```
