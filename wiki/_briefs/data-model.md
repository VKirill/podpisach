## Brief: data-model.md

Focus: Database schema — tables, relations, indices, migrations.

Files to read first:
- `prisma/schema.prisma`
- `prisma/migrations`

Schema `prisma/schema.prisma` contains 14 `model` blocks and 7 `enum` blocks.





GitNexus queries for deeper context:
- `gitnexus_cypher` with `MATCH (s)-[r:CodeRelation]->(c:Community) WHERE r.type = "MEMBER_OF" AND c.label = "Db" RETURN s.name, s.filePath LIMIT 50` — all Db symbols
- `gitnexus_cypher` with `MATCH (i:Interface) WHERE i.name ENDS WITH "Model" OR i.name CONTAINS "Schema" RETURN i.name, i.filePath LIMIT 30`

Target: 10-20 KB. Include an ER diagram (mermaid erDiagram) + table of models with purpose. Group models by domain (users / content / ads / pipeline / ...).
