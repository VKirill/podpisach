# SQL Optimization Patterns — Project-Specific Reference

> Source: PostgreSQL 17 docs + project analysis | Project: vechkasov | Generated: 2026-03-13

## Паттерны используемые в проекте

### Raw SQL с pg (Pipeline) — параметризованные запросы

Pipeline использует `pg` Pool с ручным SQL. Все запросы параметризованы через `$1, $2...`:

```typescript
// Pattern: pool.query with parameterized values (apps/pipeline/src/db/tasks.ts)
import pg from 'pg';
const { Pool } = pg; // ESM requirement — named imports don't work

const pool = new Pool({ connectionString: TASKS_DB_URL });
const result = await pool.query(
  `SELECT id, title, status FROM pipeline_tasks WHERE id = $1`,
  [taskId],
);
```

### Prisma $queryRawUnsafe для pgvector (CRM)

CRM использует Prisma, но для vector-операций — `$queryRawUnsafe`:

```typescript
// Pattern: pgvector cosine distance with Prisma (apps/crm/src/lib/agent/brain.ts)
const entries = await prisma.$queryRawUnsafe<(Entry & { similarity: number })[]>(
  `SELECT id, category, rule, confidence,
    CASE WHEN embedding IS NOT NULL
      THEN 1 - (embedding <=> $1::vector)
      ELSE 0
    END AS similarity
  FROM agent_brain_entries
  WHERE "isActive" = true
  AND (
    (embedding IS NOT NULL AND (embedding <=> $1::vector) < 0.6)
    OR keywords && $2::text[]
    OR confidence >= 0.8
  )
  ORDER BY
    CASE WHEN embedding IS NOT NULL
      THEN (embedding <=> $1::vector)
      ELSE 1
    END,
    confidence DESC
  LIMIT 10`,
  vecStr, words
);
```

**Gotcha**: всегда exclude `embedding` в обычных Prisma select — Prisma не умеет десериализовать vector type.

## Индексирование — текущие паттерны и рекомендации

### Существующие индексы (schema.prisma)

```prisma
// Single-column indexes (filtering)
@@index([status])           // pipeline_tasks, clients, leads, ad_projects
@@index([project])          // pipeline_tasks
@@index([priority])         // pipeline_tasks
@@index([parentTaskId])     // pipeline_tasks — self-referential DAG
@@index([taskId])           // pipeline_events, pipeline_comments
@@index([eventType])        // pipeline_events
@@index([createdAt])        // pipeline_events

// Composite indexes (covering frequent queries)
@@index([category, isActive])  // agent_brain_entries, ad_brain_entries
@@index([confidence])          // agent_brain_entries, ad_brain_entries
@@index([status, scheduledAt]) // scheduled_followups
@@index([projectId, type, isActive]) // ad_prompts
```

### Рекомендуемые индексы для оптимизации

```sql
-- 1. Atomic claim query (claimTask) — partial index для горячего запроса
CREATE INDEX CONCURRENTLY idx_tasks_claimable
  ON pipeline_tasks (id)
  WHERE status IN ('approved', 'new', 'planned');

-- 2. Priority-based task ordering (getTasksByStatus) — covering index
CREATE INDEX CONCURRENTLY idx_tasks_status_priority_sort
  ON pipeline_tasks (status, priority, "sortOrder" NULLS LAST, "createdAt");

-- 3. Cascade unblock check — ANY(blockedBy) uses GIN
CREATE INDEX CONCURRENTLY idx_tasks_blocked_by
  ON pipeline_tasks USING GIN ("blockedBy");

-- 4. Events timeline (hot query — SSE, observability)
CREATE INDEX CONCURRENTLY idx_events_task_created
  ON pipeline_events ("taskId", "createdAt" DESC);

-- 5. pgvector similarity search — IVFFlat or HNSW
CREATE INDEX CONCURRENTLY idx_brain_embedding_hnsw
  ON agent_brain_entries USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- For ad_brain_entries (same pattern)
CREATE INDEX CONCURRENTLY idx_ad_brain_embedding_hnsw
  ON ad_brain_entries USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 6. Memory dedup check (pipeline_memories)
CREATE INDEX CONCURRENTLY idx_memories_embedding_hnsw
  ON pipeline_memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

## EXPLAIN ANALYZE — как диагностировать

### Быстрая диагностика медленных запросов

```sql
-- Включи timing
\timing on

-- Анализ конкретного запроса (НЕ выполняет реальный запрос в EXPLAIN без ANALYZE)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, status FROM pipeline_tasks
WHERE status = ANY(ARRAY['approved', 'new', 'planned'])
ORDER BY CASE COALESCE(priority, 'medium')
  WHEN 'critical' THEN 0
  WHEN 'high' THEN 1
  WHEN 'medium' THEN 2
  ELSE 3
END, "sortOrder" ASC NULLS LAST, "createdAt" ASC
LIMIT 50;
```

### Что искать в output

```
-- ПЛОХО: Seq Scan on pipeline_tasks (cost=0.00..15.50 rows=500)
--   → таблица растёт → добавь index

-- ХОРОШО: Index Scan using idx_tasks_status on pipeline_tasks (cost=0.28..8.30 rows=5)
--   → index работает

-- ПЛОХО: Sort (cost=100.00..102.50 rows=1000) Sort Method: external merge Disk: 8192kB
--   → sort на диске → увеличь work_mem или добавь sorted index

-- ПЛОХО: Nested Loop (cost=0.00..5000.00 rows=1000000)
--   → cartesian product → проверь JOIN conditions
```

### Поиск медленных запросов в production

```sql
-- Включи pg_stat_statements (postgresql.conf уже содержит)
SELECT query, calls, mean_exec_time, total_exec_time,
       rows, shared_blks_hit, shared_blks_read
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Текущие активные запросы
SELECT pid, now() - pg_stat_activity.query_start AS duration,
       query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle'
ORDER BY duration DESC;
```

## Atomic operations — паттерны проекта

### Atomic claim (optimistic locking)

```typescript
// apps/pipeline/src/db/tasks.ts — claimTask
// WHERE status IN (...) гарантирует что только один процесс захватит задачу
const result = await pool.query(
  `UPDATE pipeline_tasks SET status = 'in_work', "updatedAt" = NOW()
   WHERE id = $1 AND status IN ('approved', 'new', 'planned')
   RETURNING id`,
  [taskId],
);
const claimed = (result.rowCount ?? 0) > 0;
```

### Upsert (INSERT ... ON CONFLICT)

```typescript
// apps/pipeline/src/scripts/course-rag-index.ts
await pool.query(
  `INSERT INTO producer_course_lessons (course, module, lesson, content, word_count)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (course, lesson) DO UPDATE
   SET content = EXCLUDED.content, word_count = EXCLUDED.word_count`,
  [course, mod, lesson, content, wordCount],
);
```

### Deduplication via similarity (pipeline_memories)

```typescript
// apps/pipeline/src/db/memory.ts — dedup before insert
const dupCheck = await pool.query(
  `SELECT id, content FROM pipeline_memories
   WHERE 1 - (embedding <=> $1::vector) > 0.95
   ORDER BY embedding <=> $1::vector LIMIT 1`,
  [vecSql],
);
if (dupCheck.rows.length > 0) return dupCheck.rows[0].id; // skip duplicate
```

## Dynamic query builder — паттерн проекта

```typescript
// Pattern from tasks.ts and memory.ts — dynamic WHERE + parameterized
function buildQuery(filters: Record<string, unknown>) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = ANY($${idx++})`);
    params.push(filters.status);
  }
  if (filters.project) {
    conditions.push(`project = $${idx++}`);
    params.push(filters.project);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params, nextIdx: idx };
}
```

## pgvector — специфика проекта

### Cosine distance operator

```sql
-- <=> оператор = cosine distance (0 = identical, 2 = opposite)
-- Проект использует threshold < 0.6 для match, > 0.95 similarity для dedup

-- Similarity = 1 - distance
SELECT 1 - (embedding <=> $1::vector) AS similarity
FROM agent_brain_entries
WHERE embedding <=> $1::vector < 0.6;  -- top matches

-- Dedup threshold (memory.ts)
WHERE 1 - (embedding <=> $1::vector) > 0.95;  -- near-identical
```

### HNSW vs IVFFlat для этого проекта

```sql
-- HNSW: лучше для малых-средних таблиц (< 1M rows) — agent_brain_entries, pipeline_memories
-- Плюсы: не нужен VACUUM, стабильная производительность
-- Минусы: медленнее build, больше RAM
CREATE INDEX USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- IVFFlat: лучше для больших таблиц (> 1M rows) — ad_embeddings при масштабировании
-- Плюсы: быстрее build, меньше RAM
-- Минусы: нужен регулярный REINDEX, качество зависит от lists
CREATE INDEX USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- SET ivfflat.probes = 10; -- при SELECT для баланса точность/скорость
```

## Parallel COUNT + SELECT

```typescript
// Pattern: parallel count + data fetch (tasks.ts queryTasks)
const [countResult, dataResult] = await Promise.all([
  pool.query<{ total: number }>(`SELECT count(*)::int as total FROM pipeline_tasks ${where}`, params),
  pool.query(`SELECT ${FIELDS} FROM pipeline_tasks ${where} ORDER BY "createdAt" DESC LIMIT $${idx} OFFSET $${idx+1}`, [...params, limit, offset]),
]);
// count(*)::int — cast to avoid BigInt serialization issues
```

## Subqueries — реальные паттерны

```sql
-- Correlated subquery for preceding events (api-observability.ts)
SELECT e.phase, e.metadata, e."createdAt"::text,
  (SELECT json_agg(json_build_object(
    'eventType', p."eventType", 'phase', p.phase, 'createdAt', p."createdAt"::text
  ) ORDER BY p."createdAt" DESC)
   FROM (SELECT * FROM pipeline_events
         WHERE "taskId" = $1 AND "createdAt" < e."createdAt"
         ORDER BY "createdAt" DESC LIMIT 3) p
  ) as preceding_events
FROM pipeline_events e
WHERE e."taskId" = $1 AND e."eventType" = 'error'
ORDER BY e."createdAt" DESC LIMIT 10;
```

## PostgreSQL 17 — полезные фичи

```sql
-- JSON aggregation (используется в проекте)
SELECT json_agg(json_build_object('key', value)) FROM table;

-- gen_random_uuid() — нативный UUID (используется в events)
INSERT INTO pipeline_events (id, ...) VALUES (gen_random_uuid()::text, ...);

-- Array operations (используется для keywords, blockedBy)
WHERE keywords && $1::text[]    -- array overlap (ANY match)
WHERE $1 = ANY("blockedBy")     -- scalar in array

-- CASE in ORDER BY (priority sorting)
ORDER BY CASE COALESCE(priority, 'medium')
  WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END;
```

## Connection pooling — best practices

```typescript
// apps/pipeline/src/db/pool-factory.ts pattern
// Используй named pools для изоляции workloads
const tasksPool = getNamedPool('tasks', { connectionString: TASKS_DB_URL });
const eventsPool = getNamedPool('events', { connectionString: PIPELINE_DB_URL });

// PostgreSQL 17 defaults: max_connections = 100
// Pipeline: 2 pools × ~10 connections = ~20
// CRM Prisma: connection_limit в URL (default 10)
// Итого: ~30 из 100 — запас для pg_stat_statements, maintenance
```
