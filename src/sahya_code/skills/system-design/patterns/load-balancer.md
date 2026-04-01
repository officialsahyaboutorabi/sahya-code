# Load Balancer Pattern

## Purpose
Distribute incoming traffic across multiple servers to prevent any single server from becoming a bottleneck.

## Types

### Layer 4 (Transport Layer)
- Works at TCP/UDP level
- Routes based on IP address and port
- Faster, less overhead
- Example: AWS NLB, HAProxy (layer 4 mode)

### Layer 7 (Application Layer)
- Works at HTTP level
- Routes based on URL, headers, cookies
- Can inspect content
- Example: AWS ALB, Nginx, HAProxy (layer 7 mode)

## Algorithms

| Algorithm | Description | Use Case |
|-----------|-------------|----------|
| Round Robin | Sequential distribution | Equal capacity servers |
| Least Connections | To server with fewest connections | Variable request times |
| IP Hash | Same client → same server | Session affinity |
| Weighted | Based on server capacity | Heterogeneous hardware |
| Random | Random selection | Simple, stateless |

## Health Checks

- **Passive**: Monitor response times, errors
- **Active**: Ping endpoint periodically
- Remove unhealthy servers automatically

## Trade-offs

**Pros:**
- Distributes load
- High availability (removes failed servers)
- SSL termination (offload from app servers)
- Single entry point for clients

**Cons:**
- Additional hop (latency)
- Single point of failure (use multiple LBs)
- Sticky sessions complicate scaling

## Scaling the Load Balancer

- DNS round-robin to multiple LBs
- Anycast IP addresses
- Active-passive LB pairs

## Example Configuration

```
Users → DNS → [Load Balancer 1]
                    ↓
            [Web Server 1] [Web Server 2] [Web Server 3]
```

Health check endpoint: `/health`
Algorithm: Least connections with 30s timeout
