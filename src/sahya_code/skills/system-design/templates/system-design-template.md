# System Design: [System Name]

## Overview
Brief description of what this system does.

---

## Step 1: Requirements & Constraints

### Functional Requirements
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

### Non-Functional Requirements
- **Scale**: X users, Y requests/day
- **Performance**: < Z ms latency for reads
- **Availability**: 99.9% uptime
- **Consistency**: Strong/Eventual

### Back-of-the-Envelope Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| Daily Active Users (DAU) | - | - |
| Requests per second (avg) | - | - |
| Requests per second (peak) | - | - |
| Storage per day | - | - |
| Storage per year | - | - |
| Bandwidth (ingress) | - | - |
| Bandwidth (egress) | - | - |

### Assumptions
- Assumption 1
- Assumption 2

---

## Step 2: High-Level Design

### Architecture Diagram
```
[Client] → [DNS] → [CDN]
              ↓
         [Load Balancer]
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
[Web]     [API]     [API]
Server   Server 1  Server 2
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
[Cache] [Database] [Object Store]
            ↓
       [Search Index]
```

### Components
1. **DNS**: Route to nearest datacenter
2. **CDN**: Cache static assets
3. **Load Balancer**: Distribute traffic
4. **Web Servers**: Handle HTTP, serve static
5. **API Servers**: Business logic
6. **Cache**: Redis/Memcached for hot data
7. **Database**: Primary storage
8. **Object Store**: Files/media (S3)
9. **Search**: Elasticsearch for search

---

## Step 3: Core Components Design

### Use Case 1: [Action]

#### API Design
```
POST /api/v1/resource
Request: { ... }
Response: { ... }
```

#### Data Model
```sql
Table: resource
- id: PRIMARY KEY
- user_id: FOREIGN KEY
- data: JSON/TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Flow
1. Client sends request
2. Load balancer routes to API server
3. Validate request
4. Write to database
5. Invalidate cache
6. Return response

### Use Case 2: [Action]
[Repeat structure...]

---

## Step 4: Scaling & Bottlenecks

### Current Bottlenecks
1. Single database
2. No caching
3. Single load balancer

### Scaling Solutions

| Bottleneck | Solution | Implementation |
|------------|----------|----------------|
| Database reads | Read replicas | 3 replicas, async replication |
| Database writes | Sharding | Hash-based on user_id |
| Static assets | CDN | CloudFront/CloudFlare |
| Hot data | Cache | Redis cluster |

### Capacity Planning

**Phase 1 (Launch)**: Handle 10k users
- 2 web servers
- 1 database (RDS/db.m5.large)
- 1 Redis instance

**Phase 2 (Growth)**: Handle 1M users
- Add load balancer
- Database read replicas
- Redis cluster
- CDN

**Phase 3 (Scale)**: Handle 10M+ users
- Database sharding
- Microservices split
- Multi-region deployment

---

## Trade-offs & Decisions

### Decision 1: [Topic]
**Option A**: [Description]
- Pros: ...
- Cons: ...

**Option B**: [Description]
- Pros: ...
- Cons: ...

**Chosen**: Option [A/B] because [reasoning]

---

## Failure Modes

| Component | Failure | Mitigation |
|-----------|---------|------------|
| Database | Master down | Automated failover to replica |
| Cache | Redis down | Fallback to database |
| Service | API server crash | Health checks, auto-restart |

---

## Monitoring & Observability

### Metrics
- Request rate (QPS)
- Error rate
- Latency (p50, p95, p99)
- Cache hit rate
- Database connections

### Alerting
- Error rate > 1%
- Latency p95 > 500ms
- Database CPU > 80%

---

## Open Questions

1. Question?
2. Question?

---

## References

- Related system designs
- Technology documentation
- Architecture decision records (ADRs)
