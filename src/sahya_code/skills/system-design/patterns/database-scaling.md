# Database Scaling Patterns

## Purpose
Handle growing data volume and query load beyond single database capacity.

## Pattern 1: Master-Slave Replication

### How It Works
- One master (writes)
- Multiple slaves (reads)
- Async replication from master to slaves

### Use Case
- Read-heavy workloads
- 80%+ reads typical for web apps

### Trade-offs
**Pros:**
- Scale reads horizontally
- Read replicas for analytics
- Failover to slave if master fails

**Cons:**
- Replication lag (stale reads)
- Doesn't scale writes
- Complexity of failover

### Example
```
        Write
          ↓
      [Master]
     ↙   ↓   ↘
[Slave 1] [Slave 2] [Slave 3]
    ↖   ↗
     Read
```

## Pattern 2: Master-Master Replication

### How It Works
- Multiple masters accept writes
- Bidirectional replication
- Conflict resolution needed

### Use Case
- Multi-region deployments
- High write availability

### Trade-offs
**Pros:**
- Write availability
- Geographic distribution

**Cons:**
- Write conflicts
- Complex consistency
- Limited scale

## Pattern 3: Federation (Functional Partitioning)

### How It Works
- Split by function/domain
- Users DB, Products DB, Orders DB
- Each database handles one domain

### Use Case
- Different domains have different access patterns
- Team autonomy (microservices)

### Trade-offs
**Pros:**
- Smaller, manageable databases
- Domain-specific optimization
- Team isolation

**Cons:**
- Cross-domain queries need joins in application
- Multiple database connections
- Complex transactions

### Example
```
[Users DB]    [Products DB]    [Orders DB]
- user_id       - product_id       - order_id
- profile       - catalog          - items
- auth          - inventory        - payment
```

## Pattern 4: Sharding (Horizontal Partitioning)

### How It Works
- Split data by key across multiple databases
- Each shard holds subset of data
- Application routes queries to correct shard

### Sharding Strategies

#### Hash-Based Sharding
```javascript
shard = hash(user_id) % num_shards
```
- Even distribution
- Hot key problem
- Re-sharding complex

#### Range-Based Sharding
```
Shard 1: user_id 1-1000
Shard 2: user_id 1001-2000
Shard 3: user_id 2001-3000
```
- Easy range queries
- Uneven distribution (some ranges hotter)
- Easy to add new shard

#### Directory-Based Sharding
- Lookup service maps key → shard
- Flexible, can move data
- Additional hop

### Use Case
- Massive datasets (TBs+)
- High write throughput
- Horizontal scaling needed

### Trade-offs
**Pros:**
- Scales writes
- Smaller indexes per shard
- Isolated failures

**Cons:**
- Complex query routing
- Cross-shard queries expensive
- Re-sharding is hard
- Hot shard problem

### Example: Twitter User Sharding
```
User A-M → Shard 1
User N-Z → Shard 2

Or by hash:
hash(user_id) % 256 = shard_number
```

## Pattern 5: Denormalization

### How It Works
- Duplicate data to avoid joins
- Pre-compute aggregations
- Accept inconsistency risk

### Use Case
- Read-heavy with complex joins
- Real-time analytics

### Trade-offs
**Pros:**
- Faster reads
- Simpler queries

**Cons:**
- Data inconsistency risk
- Complex writes (update all copies)
- More storage

### Example
```sql
-- Normalized
SELECT u.name, p.title, c.text
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN comments c ON p.id = c.post_id;

-- Denormalized (posts table includes user_name)
SELECT title, user_name, comments
FROM posts
WHERE id = ?;
```

## When to Use What

| Scale | Reads | Writes | Pattern |
|-------|-------|--------|---------|
| < 1M | < 1k/s | < 100/s | Single DB |
| 1M-10M | > 1k/s | < 500/s | Master-Slave |
| 10M+ | > 10k/s | < 1k/s | Master-Slave + Federation |
| 100M+ | Any | > 1k/s | Sharding |

## SQL Tuning

### Indexing
- Primary keys: B-tree (clustered)
- Secondary indexes: Covering indexes
- Composite indexes: Order matters (equality first, then range)

### Query Optimization
- EXPLAIN to analyze queries
- Avoid SELECT *
- Limit JOINs
- Use pagination (cursor-based for large datasets)

### Partitioning (Single DB)
- Table partitioning by time/range
- MySQL: RANGE, LIST, HASH, KEY
- PostgreSQL: Declarative partitioning

## NoSQL Alternatives

When SQL doesn't scale:
- **Cassandra**: Write-heavy, time-series
- **MongoDB**: Flexible schema, document store
- **DynamoDB**: Key-value, managed
- **Elasticsearch**: Search, analytics

## Decision Flowchart

```
Is read > 80%?
├── Yes → Master-Slave Replication
│         └── Still slow? → Add Cache
└── No → Is data > 1TB?
          ├── Yes → Sharding
          └── No → Is write > 1k/s?
                    ├── Yes → Federation
                    └── No → Optimize SQL
```
