## Brief: architecture.md

Focus: How modules connect, what invariants hold, and C4-level picture of the system.

Files to read first:
- `turbo.json`
- `package.json`
- `docker-compose.yml`

Top functional domains (aggregated by label — GitNexus splits large domains into sub-clusters):


GitNexus queries for deeper context:
- `gitnexus_cypher` with `MATCH (c:Community) WHERE c.symbolCount > 30 RETURN c.label, c.symbolCount ORDER BY c.symbolCount DESC`
- `gitnexus_cypher` with `MATCH (a:File)-[r:CodeRelation]->(b:File) WHERE r.type = "IMPORTS" AND a.path STARTS WITH "apps/pipeline" AND b.path STARTS WITH "apps/crm" RETURN a.path, b.path LIMIT 10` — cross-app dependencies (boundaries of the C4 diagram)
- `gitnexus_route_map` to see HTTP boundaries between apps

Do NOT cover:
- Per-module internals (those live in `components/*.md`)
- Known sharp edges (those live in `gotchas.md`)

Target: 10-15 KB, MUST include a C4Container mermaid diagram + numbered Key Decisions with WHY.
