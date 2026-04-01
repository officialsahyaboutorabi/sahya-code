# Caching Pattern

## Purpose
Reduce database load and improve response times by storing frequently accessed data in fast storage.

## Where to Cache

### 1. Client Cache (Browser)
- HTTP cache headers (Cache-Control, ETag)
- LocalStorage/IndexedDB
- Service Workers
- Use for: Static assets, offline data

### 2. CDN Cache
- Edge locations worldwide
- Caches static content (images, CSS, JS)
- Use for: Global content delivery

### 3. Web Server Cache
- Reverse proxy cache (Varnish, Nginx)
- Page-level or fragment caching
- Use for: Semi-dynamic content

### 4. Application Cache
- In-memory cache (Redis, Memcached)
- Object-level caching
- Use for: Database query results, sessions

### 5. Database Cache
- Query cache
- Buffer pool (InnoDB)
- Use for: Transparent optimization

## Caching Strategies

### Cache-Aside (Lazy Loading)
```
1. Check cache
2. If miss: read from DB, write to cache
3. Return data
```
- Most common pattern
- Cache and DB can get out of sync

### Write-Through
```
1. Write to cache
2. Write to DB (sync)
3. Return success
```
- Cache always up-to-date
- Slower writes

### Write-Behind (Write-Back)
```
1. Write to cache
2. Return success immediately
3. Async write to DB
```
- Fastest writes
- Risk of data loss on cache failure

### Refresh-Ahead
```
- Predictively refresh cache before expiry
- Requires good prediction model
```

## Cache Invalidation

### TTL (Time To Live)
- Set expiration time
- Simple, works for most cases
- Stale data possible

### Explicit Invalidation
- Delete cache entry on write
- Immediate consistency
- Complexity of tracking

### Write-Through
- Cache updated with DB
- Always consistent
- Slower

## Common Issues

### Cache Stampede (Thundering Herd)
- Many requests hit expired key simultaneously
- Solutions: 
  - Stale-while-revalidate
  - Per-key locking
  - Exponential backoff

### Hot Keys
- Single key gets massive traffic
- Solutions:
  - Local cache replication
  - Key sharding
  - Read replicas

### Cold Start
- Empty cache after restart
- Solutions:
  - Warm-up scripts
  - Gradual traffic ramp
  - Persistent cache (Redis RDB)

## Redis Data Structures

| Structure | Use Case | Example |
|-----------|----------|---------|
| String | Simple values | Session data |
| Hash | Objects | User profiles |
| List | Queues | Timeline feeds |
| Set | Unique collections | Tags |
| Sorted Set | Rankings | Leaderboards |
| Bitmap | Binary flags | Daily active users |

## Example: User Timeline Cache

```
Key: timeline:user:123
Type: Redis List (sorted by time)
Structure: [tweet_id, user_id, meta] per entry
Size: Keep last 1000 tweets
Expiry: LRU eviction
```

## Trade-offs

**Pros:**
- Dramatic read performance improvement
- Reduced database load
- Better user experience

**Cons:**
- Additional complexity
- Cache invalidation challenges
- Stale data
- Infrastructure cost
