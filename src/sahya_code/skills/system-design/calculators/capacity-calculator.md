# Capacity Calculator

Quick reference for back-of-the-envelope calculations.

## Conversion Constants

| From | To | Multiplier |
|------|-----|-----------|
| 1 request/sec | per month | 2.5 million |
| 40 requests/sec | per month | 100 million |
| 400 requests/sec | per month | 1 billion |
| 1 second | per month | 2.5 million seconds |

## Common Calculations

### Requests Per Second (RPS)

```
Daily Active Users (DAU) × Actions per User per Day ÷ 86,400 seconds

Example:
10 million DAU × 10 actions/day ÷ 86,400
= 100 million ÷ 86,400
= ~1,157 RPS (average)

Peak (2× average): ~2,300 RPS
```

### Storage Requirements

```
Daily Data = Daily Writes × Average Object Size
Monthly Data = Daily Data × 30
Yearly Data = Daily Data × 365

Example (Twitter-like):
10 million tweets/day × 10 KB/tweet = 100 GB/day
Monthly = 3 TB
Yearly = 36 TB
3-year projection = 108 TB
```

### Bandwidth

```
Ingress = Write QPS × Average Request Size
Egress = Read QPS × Average Response Size

Example:
Write: 1,000 RPS × 10 KB = 10 MB/s = 80 Mbps
Read: 10,000 RPS × 50 KB = 500 MB/s = 4 Gbps
```

## Quick Reference Tables

### Users to RPS

| DAU | Actions/Day | Avg RPS | Peak RPS |
|-----|-------------|---------|----------|
| 10,000 | 10 | 1.2 | 2.4 |
| 100,000 | 10 | 12 | 24 |
| 1,000,000 | 10 | 116 | 232 |
| 10,000,000 | 10 | 1,157 | 2,314 |
| 100,000,000 | 10 | 11,574 | 23,148 |

### Object Sizes

| Object | Size | Notes |
|--------|------|-------|
| Text tweet | 140 bytes | 280 chars UTF-8 |
| Tweet with metadata | 1 KB | IDs, timestamps, etc. |
| Tweet with image | 10 KB | Image stored separately |
| User profile | 2 KB | JSON |
| Product page | 50 KB | HTML + images ref |
| Web page | 2 MB | Average modern page |

### Storage Growth

| Daily Writes | Object Size | Daily | Monthly | Yearly |
|--------------|-------------|-------|---------|--------|
| 1M | 1 KB | 1 GB | 30 GB | 365 GB |
| 10M | 1 KB | 10 GB | 300 GB | 3.6 TB |
| 100M | 1 KB | 100 GB | 3 TB | 36 TB |
| 1M | 10 KB | 10 GB | 300 GB | 3.6 TB |
| 10M | 10 KB | 100 GB | 3 TB | 36 TB |
| 100M | 10 KB | 1 TB | 30 TB | 365 TB |

### Server Capacity Estimates

| Server Type | RPS | Concurrent Connections | Notes |
|-------------|-----|----------------------|-------|
| Small (2 vCPU, 4GB) | 100-500 | 1,000 | Dev/test |
| Medium (4 vCPU, 8GB) | 500-2,000 | 5,000 | Production single |
| Large (8 vCPU, 16GB) | 2,000-10,000 | 20,000 | Production load |
| XLarge (16 vCPU, 32GB) | 10,000-50,000 | 100,000 | High traffic |

### Database Capacity (Rough Estimates)

| Database | Reads/sec | Writes/sec | Storage |
|----------|-----------|------------|---------|
| PostgreSQL (single) | 10,000 | 1,000 | TBs |
| PostgreSQL (replica) | 50,000 | (read-only) | TBs |
| MySQL (single) | 10,000 | 1,000 | TBs |
| Redis (single) | 100,000 | 50,000 | 100s GB |
| Cassandra (cluster) | 100,000+ | 50,000+ | PBs |
| Elasticsearch (cluster) | 10,000 | 5,000 | TBs |

### Network Bandwidth

| Traffic | Size | Notes |
|---------|------|-------|
| 1 Mbps | 128 KB/s | Slow mobile |
| 10 Mbps | 1.25 MB/s | Fast mobile |
| 100 Mbps | 12.5 MB/s | Typical broadband |
| 1 Gbps | 125 MB/s | Datacenter |
| 10 Gbps | 1.25 GB/s | High-end DC |

## Example Calculations

### URL Shortener (like bit.ly)

**Assumptions:**
- 100M DAU
- 1 shorten per user per day = 100M/day
- 10 redirect per user per day = 1B/day

**Writes:**
- 100M/day ÷ 86,400 = ~1,160 writes/sec
- Peak (2×) = ~2,300 writes/sec

**Reads:**
- 1B/day ÷ 86,400 = ~11,600 reads/sec
- Peak (2×) = ~23,200 reads/sec

**Storage:**
- 100M URLs/day × 500 bytes = 50 GB/day
- Monthly = 1.5 TB
- Yearly = 18 TB
- 3-year = 54 TB

**Bandwidth:**
- Write: 1,160 × 500 B = 580 KB/s = 4.6 Mbps
- Read: 11,600 × 500 B = 5.8 MB/s = 46 Mbps

### Twitter Timeline

**Assumptions:**
- 100M DAU
- 2 tweets/day = 200M tweets/day
- 50 timeline views/day = 5B views/day
- 100 followers average, 10% active = 10 fanout

**Writes:**
- 200M tweets/day = ~2,300 writes/sec

**Fanout:**
- 200M × 10 = 2B timeline writes/day
- = ~23,000 writes/sec to timelines

**Reads:**
- 5B timeline views/day = ~58,000 reads/sec

**Storage:**
- 200M tweets × 10 KB = 2 TB/day
- Monthly = 60 TB
- Yearly = 730 TB

## Memory Reference

| Operation | Time | Relative |
|-----------|------|----------|
| L1 cache reference | 0.5 ns | 1× |
| L2 cache reference | 7 ns | 14× |
| Main memory reference | 100 ns | 200× |
| SSD random read | 16 μs | 32,000× |
| Disk seek | 2 ms | 4,000,000× |
| Datacenter round trip | 0.5 ms | 1,000,000× |
| Transcontinental RTT | 150 ms | 300,000,000× |

## Quick Formulas

```
# Monthly to per-second
requests_per_second = monthly_requests / 2_500_000

# Storage projection
storage_3year = daily_writes × object_size × 365 × 3

# Cache size estimation
cache_size = daily_active_users × average_object_size × working_set_ratio
# working_set_ratio typically 0.2 (20% of data is 80% of reads)

# Database connections needed
connections = (web_servers × connection_pool_size) + admin_buffer
# typical: 50 servers × 20 connections = 1,000 connections
```
