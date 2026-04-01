# System Design: URL Shortener (like bit.ly)

## Overview
Service that takes a long URL and returns a short URL that redirects to the original.

---

## Step 1: Requirements & Constraints

### Functional Requirements
- Shorten long URL to short code
- Redirect short code to original URL
- Custom short codes (optional)
- URL expiration (optional)
- Analytics: click count (optional)

### Non-Functional Requirements
- **Scale**: 100M new URLs/month, 10B redirects/month
- **Performance**: < 100ms for redirect
- **Availability**: 99.9%
- **Consistency**: Strong (URL mapping must be accurate)

### Back-of-the-Envelope

| Metric | Calculation | Result |
|--------|-------------|--------|
| New URLs/day | 100M ÷ 30 | ~3.3M/day |
| Redirects/day | 10B ÷ 30 | ~333M/day |
| Write QPS | 3.3M ÷ 86,400 | ~38/sec |
| Read QPS | 333M ÷ 86,400 | ~3,858/sec |
| Storage (3 years) | 3.3M × 500B × 365 × 3 | ~1.8 TB |

Assumptions:
- Average URL length: 500 bytes (metadata + original URL)
- 7-character short code (Base62)

---

## Step 2: High-Level Design

```
[Client] → [Load Balancer] → [API Servers] → [Database]
                                    ↓
                                [Cache]
                                    ↓
                               [Analytics Queue]
```

### API Endpoints

```
POST /api/v1/shorten
Request: { "url": "https://example.com/very/long/path" }
Response: { "short_url": "https://short.io/abc123", "code": "abc123" }

GET /:code
Response: 302 Redirect to original URL
```

---

## Step 3: Core Components

### URL Shortening Flow

1. **Validate URL**
   - Check format
   - Optional: Check for malicious URLs

2. **Generate Short Code**
   - Option A: Hash-based (MD5 of URL → Base62)
   - Option B: Base62 of auto-increment ID
   - Handle collisions

3. **Store Mapping**
   ```sql
   CREATE TABLE url_mappings (
     short_code VARCHAR(7) PRIMARY KEY,
     original_url TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP NULL,
     user_id INT NULL,
     click_count INT DEFAULT 0
   );
   ```

4. **Return Short URL**

### URL Encoding Options

#### Option A: Base62 of Auto-Increment ID
```python
def encode(id):
    chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    result = ""
    while id > 0:
        result = chars[id % 62] + result
        id //= 62
    return result

# Example: id=1000000 → "4c92"
```

**Pros:**
- Simple, guaranteed unique
- Sequential (predictable)

**Cons:**
- Predictable short codes
- Single DB write point

#### Option B: MD5 Hash + Base62
```python
import hashlib

def shorten(url):
    hash = hashlib.md5(url.encode()).hexdigest()[:8]
    # Convert to Base62
    return base62_encode(int(hash, 16))[:7]
```

**Pros:**
- Same URL → same code (idempotent)
- Distributed generation possible

**Cons:**
- Hash collisions
- Not sequential

**Chosen: Option A (Auto-Increment)**
- Simpler, collisions handled naturally
- Use database sequence or Snowflake ID

### Redirect Flow

1. **Check Cache**
   - Key: `short_url:{code}`
   - Value: original URL

2. **If Miss: Query Database**
   - SELECT original_url FROM url_mappings WHERE short_code = ?

3. **Update Cache**
   - TTL: 24 hours

4. **Increment Analytics** (async)
   - Queue message for click count

5. **Redirect**
   - HTTP 302 (temporary) or 301 (permanent)

### 301 vs 302 Redirect

| Aspect | 301 (Permanent) | 302 (Temporary) |
|--------|-----------------|-----------------|
| Browser caching | Yes, cached forever | No, always checks |
| Analytics accuracy | Lower (cached) | Higher |
| SEO | Passes link juice | Does not |
| Update URL | Hard (cached) | Easy |

**Decision**: Use 302 for flexibility, 301 if URL never changes.

---

## Step 4: Scaling

### Database Scaling

**Phase 1: Single DB**
- Read replicas for redirects
- Master for writes

**Phase 2: Sharding**
- Shard by short_code hash
- 256 shards: `shard = hash(code) % 256`

### Cache Strategy

**Cache-Aside (Lazy Loading)**
- Check cache on redirect
- Populate on cache miss
- TTL: 24 hours

**Cache Size Estimation**
- 100M active URLs × 500 bytes = 50 GB
- Working set: 20% = 10 GB
- Redis cluster with 3 nodes

### Analytics

Don't block redirect for analytics:
```
Redirect Flow:
1. Return 302 immediately
2. Async: Send message to Kafka/SQS
3. Worker: Batch update click_count in DB
```

---

## Trade-offs

| Decision | Option Chosen | Alternative | Reason |
|----------|---------------|-------------|--------|
| Encoding | Auto-increment | Hash | Simplicity, no collisions |
| Redirect | 302 | 301 | Flexibility, analytics |
| Analytics | Async queue | Sync write | Don't block redirect |
| Cache | Redis | In-memory | Persistence, shared |

---

## Advanced: Handling Scale

### Pre-generated Short Codes
For extremely high write volume:
1. Pre-generate codes in batches
2. Store in "available_codes" table
3. Service claims code on demand
4. Eliminates write contention

### Rate Limiting
- Per-IP: 10 shortens/minute
- Per-user: 100 shortens/hour
- Prevents abuse

### Malicious URL Detection
- Integrate with Google Safe Browsing API
- Check on shorten
- Periodically re-check active URLs
