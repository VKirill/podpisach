## Brief: gaps.md

Focus: Honest audit of what the wiki does NOT yet cover. Each gap is actionable.

Uncovered communities from the graph (candidate entries):
- (no significant uncovered communities)

GitNexus query to double-check:
- `gitnexus_cypher` with `MATCH (c:Community) WHERE c.symbolCount > 30 RETURN c.label, c.symbolCount ORDER BY c.symbolCount DESC`

Other gap types to enumerate:
- Files that seem important but no page references them (pick top 5-10)
- Open questions a future contributor would need answered
- Sections of existing pages that are thin and need expansion

Target: 6-15 KB. Use tables for structured gaps.
