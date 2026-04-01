---
name: "system-design"
description: "Creates a structured approach to designing scalable distributed systems, adapted from the System Design Primer methodology."
version: "1.0.0"
safety_level: "high"
---
# System Design Skill

A structured approach to designing scalable distributed systems, adapted from the System Design Primer methodology.

## When to Use This Skill

Use this skill when:
- Designing a new system from scratch
- Scaling an existing system to handle more users/traffic
- Preparing for system design interviews
- Reviewing architecture decisions
- Analyzing trade-offs between different approaches

**Trigger phrases:**
- "Design a system for..."
- "How would I architect..."
- "System design: ..."
- "Scale [X] to millions of users"
- "Design [service] like [existing service]"

## The 4-Step System Design Process

Always follow this structured approach:

### Step 1: Outline Use Cases and Constraints

**Gather requirements first. Ask clarifying questions:**

#### Functional Requirements (Use Cases)
- What are the core features?
- Who are the users?
- What actions can users take?

#### Non-Functional Requirements (Constraints)
- Expected scale (users, requests, data)
- Performance requirements (latency, throughput)
- Availability requirements (99.9%, 99.99%)
- Consistency vs availability preferences

#### Back-of-the-Envelope Calculations
Use these handy conversions:
- 1 request/second = 2.5 million requests/month
- 40 requests/second = 100 million requests/month
- 400 requests/second = 1 billion requests/month

**Calculate:**
- Read QPS (queries per second)
- Write QPS
- Storage requirements (per day/month/year)
- Bandwidth requirements

### Step 2: Create a High-Level Design

**Sketch the architecture with these core components:**

```
[Client] → [DNS] → [CDN]
              ↓
         [Load Balancer] → [Web Server (Reverse Proxy)]
                                ↓
                           [API/Application Servers]
                                ↓
                    ┌───────────┼───────────┐
                    ↓           ↓           ↓
                [Cache]   [Database]   [Object Store]
                    ↓           ↓
                [Queue]   [Search Index]
```

**Key Components to Consider:**
- DNS for routing
- CDN for static assets
- Load balancer for distributing traffic
- Web servers as reverse proxies
- Application servers for business logic
- Cache for read-heavy data
- Database for persistent storage
- Message queues for async processing
- Object storage for files/media

### Step 3: Design Core Components

**Dive into details for each major feature:**

For each use case:
1. **API Design** - REST endpoints, request/response formats
2. **Data Model** - Schema, relationships, access patterns
3. **Algorithm/Flow** - Step-by-step process
4. **Component Interactions** - Which services talk to which

**Consider:**
- Read vs write patterns
- Hot spots and bottlenecks
- Data consistency requirements

### Step 4: Scale the Design

**Identify and address bottlenecks:**

Follow this iterative process:
1. **Benchmark/Load Test** - Measure current performance
2. **Profile** - Identify bottlenecks
3. **Address** - Implement scaling solutions
4. **Repeat** - Continue iteration

**Scaling Techniques (apply as needed):**

| Bottleneck | Solution | Trade-off |
|------------|----------|-----------|
| Single server | Horizontal scaling | Complexity |
| Database reads | Read replicas | Replication lag |
| Database writes | Sharding | Cross-shard queries |
| Hot data | Cache layer | Stale data |
| Static assets | CDN | Cost |
| Slow operations | Async queues | Complexity |
| Search | Search cluster (Elasticsearch) | Infrastructure |

## System Design Patterns Reference

### Consistency Patterns

**Weak Consistency**
- After write, read may or may not see it
- Use: Real-time gaming, VoIP

**Eventual Consistency**
- After write, reads will eventually see it
- Use: DNS, email, DynamoDB

**Strong Consistency**
- After write, all reads see it immediately
- Use: Financial transactions, inventory

### Availability Patterns

**Fail-Over**
- Active-Passive: Heartbeat checks, failover on failure
- Active-Active: Both handle traffic, share load

**Replication**
- Master-Slave: Writes to master, reads from slaves
- Master-Master: Both handle writes, conflict resolution needed

### Database Scaling

**Federation (Functional Partitioning)**
- Split by function (users DB, products DB)
- Pros: Smaller DBs, specialized optimization
- Cons: Cross-DB queries, complex app logic

**Sharding (Horizontal Partitioning)**
- Split by hash/key range
- Pros: Scale writes, smaller indexes
- Cons: Hot shards, resharding complexity

**Denormalization**
- Duplicate data to reduce joins
- Pros: Faster reads
- Cons: Data inconsistency risk, complex writes

### Caching Strategies

**Cache-Aside (Lazy Loading)**
1. Check cache
2. If miss, read from DB
3. Write to cache
4. Return data

**Write-Through**
1. Write to cache
2. Write to DB (synchronously)
3. Return success

**Write-Behind (Write-Back)**
1. Write to cache
2. Return success immediately
3. Async write to DB

**Refresh-Ahead**
- Predictively refresh cache before expiry

### Microservices Patterns

**Service Discovery**
- Services register themselves
- Clients query registry to find services
- Tools: Consul, Eureka, Zookeeper

**API Gateway**
- Single entry point for clients
- Handles auth, rate limiting, routing

**Circuit Breaker**
- Fail fast when service is down
- Prevent cascade failures

## Common System Design Scenarios

### Design a URL Shortener (like bit.ly)

**Requirements:**
- Shorten long URLs
- Redirect to original
- Track analytics

**High-Level:**
```
[Client] → [Load Balancer] → [API Servers] → [Database]
                                              ↓
                                          [Cache]
```

**Key Design Points:**
- Base62 encoding of auto-increment ID
- 301 vs 302 redirect (caching vs analytics)
- Database sharding by short URL hash

### Design Twitter Timeline

**Requirements:**
- Post tweets
- View home timeline (followers)
- View user timeline
- Search tweets

**Key Design Points:**
- Fan-out on write vs fan-out on read
- Celebrity problem (millions of followers)
- Timeline caching in Redis
- Search index (Elasticsearch)

### Design a Chat System (like WhatsApp)

**Requirements:**
- 1:1 messaging
- Group chats
- Online status
- Message persistence

**Key Design Points:**
- WebSocket for real-time
- Message queue for delivery
- Last-seen in cache
- Read receipts handling

### Design a Web Crawler

**Requirements:**
- Crawl web pages
- Extract links
- Respect robots.txt
- Distribute workload

**Key Design Points:**
- Queue for URLs to crawl
- Bloom filter for deduplication
- Distributed workers
- Politeness delay

## Performance Numbers to Know

### Latency (approximate)

| Operation | Time |
|-----------|------|
| L1 cache reference | 0.5 ns |
| L2 cache reference | 7 ns |
| Main memory reference | 100 ns |
| SSD random read | 16,000 ns (16 μs) |
| Disk seek | 2,000,000 ns (2 ms) |
| Same datacenter round trip | 500,000 ns (0.5 ms) |
| Transcontinental round trip | 150,000,000 ns (150 ms) |

### Throughput

- Memory: ~10 GB/s sequential read
- SSD: ~500 MB/s sequential read
- Disk: ~100 MB/s sequential read
- 1 Gbps network: ~125 MB/s

## Decision Framework

### SQL vs NoSQL

**Choose SQL when:**
- Complex relationships (joins needed)
- ACID transactions required
- Structured data with schema
- Examples: PostgreSQL, MySQL

**Choose NoSQL when:**
- Massive scale (PBs of data)
- Unstructured/semi-structured data
- High write throughput needed
- Flexible schema

**NoSQL Types:**
- **Key-Value**: Redis, DynamoDB (caching, sessions)
- **Document**: MongoDB, CouchDB (content, catalogs)
- **Wide-Column**: Cassandra, HBase (time-series, logs)
- **Graph**: Neo4j (social networks, recommendations)

### Synchronous vs Asynchronous

**Synchronous:**
- Use: Simple, immediate consistency needed
- Cons: Blocking, slow, cascade failures

**Asynchronous:**
- Use: High throughput, eventual consistency OK
- Tools: Message queues (RabbitMQ, Kafka, SQS)
- Pros: Decoupled, resilient, scalable

### REST vs RPC

**REST:**
- HTTP + JSON
- Good for external APIs
- Stateless, cacheable

**RPC (gRPC, Thrift):**
- Binary protocols (Protobuf)
- Good for internal service communication
- Higher performance

## Interview Tips

1. **Ask clarifying questions** - Don't assume requirements
2. **Start simple** - Basic design first, then scale
3. **Discuss trade-offs** - Every decision has pros/cons
4. **Calculate numbers** - Show you can do back-of-envelope math
5. **Draw diagrams** - Visual communication is key
6. **Know when to stop** - Don't over-engineer

## Anti-Patterns to Avoid

- **Premature optimization** - Solve for current scale + 10x
- **Single points of failure** - Always have redundancy
- **Ignoring monitoring** - You can't optimize what you don't measure
- **Over-engineering** - Simple solutions are often best
- **Not considering failure modes** - What happens when X fails?

## Resources

This skill is adapted from the [System Design Primer](https://github.com/donnemartin/system-design-primer) by Donne Martin, licensed under CC-BY-SA.

Additional resources:
- [Designing Data-Intensive Applications](https://dataintensive.net/) by Martin Kleppmann
- [High Scalability Blog](http://highscalability.com/)
- AWS Architecture Center
- Google Cloud Architecture Center
