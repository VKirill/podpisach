# PostgreSQL 17 Reference Documentation

> Source: Context7 — `/websites/postgresql_17`
> Generated: 2026-03-11

---

## Indexing Strategies

### Index Types

| Index Type | Use Case | Operators |
|------------|----------|-----------|
| **B-tree** | Default. Equality, range, sorting (`=`, `<`, `>`, `BETWEEN`, `ORDER BY`) | All comparison operators |
| **GIN** | Full-text search, JSONB containment, arrays, trigrams | `@>`, `@@`, `?`, `?&`, `?\|` |
| **GiST** | Geometric, full-text (smaller but slower than GIN), range types | `&&`, `@>`, `<@`, `<<`, `>>` |
| **SP-GiST** | Non-balanced data: phone numbers, IP addresses | Space-partitioned |
| **BRIN** | Very large tables with natural ordering (timestamps, sequential IDs) | Block range |
| **Hash** | Equality-only comparisons | `=` |
| **Bloom** | Multi-column equality when any subset of columns may be queried | `=` |

### B-tree Index

```sql
CREATE INDEX btreeidx ON tbloom (i1, i2, i3, i4, i5, i6);
SELECT pg_size_pretty(pg_relation_size('btreeidx'));
```

**Important**: B-tree multi-column indexes are most efficient when the leading columns are constrained. A query filtering only on `i2` and `i5` may not use `btreeidx(i1,i2,i3,i4,i5,i6)` efficiently.

### GIN Index for Full Text Search

```sql
-- Standard tsvector GIN index
CREATE INDEX idx_fts ON documents USING GIN (to_tsvector('english', content));

-- Soundex-based full text search
CREATE TABLE s (nm text);
CREATE INDEX ix_s_txt ON s USING gin (soundex_tsvector(nm)) WITH (fastupdate = off);

SELECT * FROM s WHERE soundex_tsvector(nm) @@ soundex_tsquery('john');
```

**Preferred for text search**: GIN indexes are the preferred text search index type. As inverted indexes, they contain an index entry for each word (lexeme), with a compressed list of matching locations. Multi-word searches can find the first match, then use the index to remove rows that are lacking additional words. GIN indexes store only the words (lexemes) of `tsvector` values, and not their weight labels.

### GIN Index for Trigram Similarity

```sql
CREATE TABLE test_trgm (t text);
CREATE INDEX trgm_idx ON test_trgm USING GIN (t gin_trgm_ops);
```

GIN indexes with `gin_trgm_ops` support LIKE, ILIKE, and regex queries.

---

## EXPLAIN ANALYZE

### Basic Usage

```sql
EXPLAIN ANALYZE SELECT * FROM tenk1 WHERE ten < 7;
```

### Join Analysis

```sql
EXPLAIN ANALYZE SELECT *
FROM tenk1 t1, tenk2 t2
WHERE t1.unique1 < 10 AND t1.unique2 = t2.unique2;
```

### With Sorting

```sql
EXPLAIN ANALYZE SELECT *
FROM tenk1 t1, tenk2 t2
WHERE t1.unique1 < 100 AND t1.unique2 = t2.unique2
ORDER BY t1.fivethous;
```

Output includes:
- **Estimated costs** (startup cost..total cost)
- **Actual times** (in ms)
- **Row counts** (estimated vs actual)
- **Loop counts** per node
- **Planning Time** and **Execution Time**

Use `EXPLAIN (ANALYZE, BUFFERS, FORMAT YAML)` for detailed buffer usage and structured output.

---

## Window Functions

### ROW_NUMBER, RANK, DENSE_RANK

```sql
SELECT
    column1,
    row_number() OVER (ORDER BY column1) AS rn,
    rank() OVER (ORDER BY column1) AS rnk,
    dense_rank() OVER (ORDER BY column1) AS drnk
FROM your_table;
```

- `row_number()` — sequential number within partition, counting from 1
- `rank()` — rank with gaps (tied rows get same rank, next rank skips)
- `dense_rank()` — rank without gaps

### LAG and LEAD

```sql
SELECT
    column1,
    lag(column1, 1, 'default_value') OVER (ORDER BY some_order_column) AS previous_value,
    lead(column1, 1, 'default_value') OVER (ORDER BY some_order_column) AS next_value
FROM your_table;
```

### All Window Functions

| Function | Description |
|----------|-------------|
| `row_number()` | Sequential number in partition |
| `rank()` | Rank with gaps |
| `dense_rank()` | Rank without gaps |
| `percent_rank()` | Relative rank (0-1) |
| `cume_dist()` | Cumulative distribution (0-1) |
| `ntile(n)` | Divide into n buckets |
| `lag(value, offset, default)` | Access preceding row |
| `lead(value, offset, default)` | Access following row |
| `first_value(value)` | First value in window frame |
| `last_value(value)` | Last value in window frame |
| `nth_value(value, n)` | Nth value in window frame |

---

## Table Partitioning

### Partition Strategies

```sql
-- RANGE partitioning (dates, numbers)
CREATE TABLE measurements (
    id          SERIAL,
    logdate     DATE NOT NULL,
    peaktemp    INT,
    unitsales   INT
) PARTITION BY RANGE (logdate);

CREATE TABLE measurements_y2024 PARTITION OF measurements
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE measurements_y2025 PARTITION OF measurements
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- LIST partitioning (categories, status)
CREATE TABLE orders (
    id      SERIAL,
    region  TEXT NOT NULL,
    amount  NUMERIC
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('US');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('EU');

-- HASH partitioning (even distribution)
CREATE TABLE events (
    id      SERIAL,
    user_id INT NOT NULL,
    data    JSONB
) PARTITION BY HASH (user_id);

CREATE TABLE events_p0 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE events_p1 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE events_p2 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE events_p3 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

**Key notes**:
- Range and list partitioning require a btree operator class
- Hash partitioning requires a hash operator class
- Partition key: up to 32 columns for range/hash, single column for list
- Data rows are directed to partitions based on partition key values
- An error is reported if no existing partition matches

---

## JSONB Operations

### Containment Operator `@>`

```sql
-- Does the JSON contain this sub-structure?
SELECT '{"product": "PostgreSQL", "version": 9.4}'::jsonb @> '{"version": 9.4}'::jsonb;
-- true

-- Array containment
SELECT '[1, 2, 3]'::jsonb @> '[1, 3]'::jsonb;
-- true (order doesn't matter)

-- Nested objects require full path
SELECT '{"foo": {"bar": "baz"}}'::jsonb @> '{"bar": "baz"}'::jsonb;
-- false (must match at same nesting level)

SELECT '{"foo": {"bar": "baz"}}'::jsonb @> '{"foo": {}}'::jsonb;
-- true

-- Array contains scalar
SELECT '["foo", "bar"]'::jsonb @> '"bar"'::jsonb;
-- true
```

### JSONB Build and Aggregate Functions

```sql
-- Build JSON object
SELECT json_build_object('foo', 1, 2, row(3,'bar'));
-- {"foo" : 1, "2" : {"f1":3,"f2":"bar"}}

-- Aggregate into JSON array
SELECT jsonb_agg(name) FROM users;

-- Aggregate into JSON object
SELECT jsonb_object_agg(key, value) FROM settings;
```

### jsonb_set — Update JSONB Structure

```sql
-- Replace existing value at path
SELECT jsonb_set('[{"f1":1,"f2":null},2,null,3]', '{0,f1}', '[2,3,4]', false);
-- [{"f1": [2, 3, 4], "f2": null}, 2, null, 3]

-- Add new key (create_if_missing = true by default)
SELECT jsonb_set('[{"f1":1,"f2":null},2]', '{0,f3}', '[2,3,4]');
-- [{"f1": 1, "f2": null, "f3": [2, 3, 4]}, 2]
```

### JSONB Operators Reference

| Operator | Description | Example |
|----------|-------------|---------|
| `->` | Get JSON object field (as json) | `'{"a":1}'::jsonb -> 'a'` |
| `->>` | Get JSON object field (as text) | `'{"a":1}'::jsonb ->> 'a'` |
| `#>` | Get JSON object at path (as json) | `'{"a":{"b":1}}'::jsonb #> '{a,b}'` |
| `#>>` | Get JSON object at path (as text) | `'{"a":{"b":1}}'::jsonb #>> '{a,b}'` |
| `@>` | Contains | `'{"a":1}'::jsonb @> '{"a":1}'` |
| `<@` | Is contained by | `'{"a":1}'::jsonb <@ '{"a":1,"b":2}'` |
| `?` | Key exists | `'{"a":1}'::jsonb ? 'a'` |
| `?\|` | Any key exists | `'{"a":1}'::jsonb ?\| array['a','b']` |
| `?&` | All keys exist | `'{"a":1,"b":2}'::jsonb ?& array['a','b']` |
| `\|\|` | Concatenate | `'{"a":1}'::jsonb \|\| '{"b":2}'::jsonb` |
| `-` | Delete key | `'{"a":1,"b":2}'::jsonb - 'a'` |
| `#-` | Delete at path | `'{"a":{"b":1}}'::jsonb #- '{a,b}'` |

---

## Triggers

### CREATE TRIGGER Syntax

```sql
CREATE [ OR REPLACE ] [ CONSTRAINT ] TRIGGER name
    { BEFORE | AFTER | INSTEAD OF } { event [ OR ... ] }
    ON table_name
    [ FROM referenced_table_name ]
    [ NOT DEFERRABLE | [ DEFERRABLE ] [ INITIALLY IMMEDIATE | INITIALLY DEFERRED ] ]
    [ REFERENCING { { OLD | NEW } TABLE [ AS ] transition_relation_name } [ ... ] ]
    [ FOR [ EACH ] { ROW | STATEMENT } ]
    [ WHEN ( condition ) ]
    EXECUTE { FUNCTION | PROCEDURE } function_name ( arguments )
```

### Trigger Events

- `INSERT` — after row insertion
- `UPDATE [ OF column_name ]` — after row update (optionally column-specific)
- `DELETE` — after row deletion
- `TRUNCATE` — after table truncation (statement-level only)

### Trigger Timing

- `BEFORE` — execute before the operation (can modify NEW row or cancel)
- `AFTER` — execute after the operation
- `INSTEAD OF` — execute instead of the operation (views only)

### Example: Audit Trigger

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data, changed_at)
        VALUES (TG_TABLE_NAME, 'INSERT', row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_at)
        VALUES (TG_TABLE_NAME, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, changed_at)
        VALUES (TG_TABLE_NAME, 'DELETE', row_to_json(OLD), NOW());
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_func();
```

---

## Full Text Search

### Creating tsvector and tsquery

```sql
-- Convert text to tsvector
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');

-- Create search query
SELECT to_tsquery('english', 'quick & fox');

-- Search
SELECT * FROM documents
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'quick & fox');
```

### GIN Index for Full Text Search

```sql
-- Create index on tsvector column
CREATE INDEX idx_fts ON documents USING GIN (tsv_column);

-- Or on computed tsvector
CREATE INDEX idx_fts ON documents USING GIN (to_tsvector('english', content));
```

**GIN vs GiST for text search**:
- GIN: faster lookups, slower builds, larger size, preferred for most cases
- GiST: faster builds, smaller size, slower lookups, lossy (requires recheck)

---

## Common Table Expressions (CTEs)

### Basic CTE

```sql
WITH regional_sales AS (
    SELECT region, SUM(amount) AS total_sales
    FROM orders
    GROUP BY region
),
top_regions AS (
    SELECT region
    FROM regional_sales
    WHERE total_sales > (SELECT SUM(total_sales) / 10 FROM regional_sales)
)
SELECT region, product, SUM(quantity) AS product_units, SUM(amount) AS product_sales
FROM orders
WHERE region IN (SELECT region FROM top_regions)
GROUP BY region, product;
```

### Recursive CTE

```sql
WITH RECURSIVE subordinates AS (
    -- Base case: the root employee
    SELECT id, name, manager_id, 1 AS depth
    FROM employees
    WHERE id = 1

    UNION ALL

    -- Recursive case: find subordinates
    SELECT e.id, e.name, e.manager_id, s.depth + 1
    FROM employees e
    INNER JOIN subordinates s ON e.manager_id = s.id
)
SELECT * FROM subordinates ORDER BY depth, name;
```

---

## Stored Procedures / Functions (PL/pgSQL)

### CREATE FUNCTION

```sql
CREATE OR REPLACE FUNCTION calculate_discount(
    price NUMERIC,
    discount_pct NUMERIC DEFAULT 10
)
RETURNS NUMERIC AS $$
DECLARE
    result NUMERIC;
BEGIN
    result := price * (1 - discount_pct / 100.0);
    RETURN ROUND(result, 2);
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT calculate_discount(100, 15);  -- Returns 85.00
```

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON my_table
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

---

## Performance Tuning

### Key Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `shared_buffers` | 128MB | Shared memory for caching (25% of RAM) |
| `work_mem` | 4MB | Memory per sort/hash operation |
| `maintenance_work_mem` | 64MB | Memory for VACUUM, CREATE INDEX |
| `effective_cache_size` | 4GB | Planner estimate of OS cache (50-75% RAM) |
| `random_page_cost` | 4.0 | Cost of non-sequential disk read (1.1 for SSD) |
| `effective_io_concurrency` | 1 | Concurrent I/O operations (200 for SSD) |
| `max_worker_processes` | 8 | Max background workers |
| `max_parallel_workers_per_gather` | 2 | Max parallel workers per query |

### VACUUM and ANALYZE

```sql
-- Manual vacuum and analyze
VACUUM ANALYZE my_table;

-- Verbose vacuum
VACUUM (VERBOSE) my_table;

-- Full vacuum (rewrites table, requires exclusive lock)
VACUUM FULL my_table;

-- Just update statistics
ANALYZE my_table;
```

### Autovacuum Tuning

```sql
-- Per-table autovacuum settings
ALTER TABLE high_churn_table SET (
    autovacuum_vacuum_threshold = 50,
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_threshold = 50,
    autovacuum_analyze_scale_factor = 0.05
);
```

---

## Useful Patterns

### DISTINCT ON

```sql
-- Get the latest order per customer
SELECT DISTINCT ON (customer_id)
    customer_id, order_id, order_date, amount
FROM orders
ORDER BY customer_id, order_date DESC;
```

### LATERAL JOIN

```sql
-- Get top 3 orders per customer
SELECT c.name, o.*
FROM customers c
CROSS JOIN LATERAL (
    SELECT order_id, amount, order_date
    FROM orders
    WHERE customer_id = c.id
    ORDER BY amount DESC
    LIMIT 3
) o;
```

### MERGE (Upsert)

```sql
MERGE INTO target_table t
USING source_table s ON t.id = s.id
WHEN MATCHED THEN
    UPDATE SET name = s.name, updated_at = NOW()
WHEN NOT MATCHED THEN
    INSERT (id, name, created_at) VALUES (s.id, s.name, NOW());
```

### INSERT ... ON CONFLICT (Upsert)

```sql
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, updated_at = NOW();
```
