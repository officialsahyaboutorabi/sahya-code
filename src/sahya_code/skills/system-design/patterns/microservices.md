# Microservices Pattern

## Purpose
Decompose monolithic application into independent, deployable services.

## Characteristics

- **Single Responsibility**: Each service does one thing well
- **Independently Deployable**: Deploy without affecting others
- **Decentralized Data**: Each service owns its data
- **Polyglot**: Different tech stacks per service
- **Resilient**: Failures isolated to single service

## Service Boundaries

### Good Boundaries (Domain-Driven)
- Users Service
- Orders Service
- Inventory Service
- Payment Service
- Notification Service

### Bad Boundaries (Technical)
- Database Service
- Business Logic Service
- Frontend Service

## Communication Patterns

### Synchronous (Request/Response)
- REST/HTTP
- gRPC
- Use for: Queries, immediate consistency needed

### Asynchronous (Event-Driven)
- Message Queue (RabbitMQ, SQS)
- Event Bus (Kafka)
- Use for: Commands, eventual consistency OK

### Trade-offs
| Aspect | Sync | Async |
|--------|------|-------|
| Latency | Higher (chained calls) | Lower (fire-and-forget) |
| Coupling | Tight | Loose |
| Consistency | Immediate | Eventual |
| Failure Handling | Complex (retries) | Queue persists |
| Debugging | Easier | Harder (trace IDs) |

## Service Discovery

### Client-Side Discovery
- Client queries registry, picks instance
- Netflix Eureka, Consul

### Server-Side Discovery
- Load balancer queries registry
- AWS ALB, Kubernetes Services

### Service Registry
```
Service Registration:
- On startup: POST /register {name, host, port, health}
- Heartbeat: PUT /heartbeat every 30s
- On shutdown: DELETE /deregister
```

## API Gateway

### Responsibilities
- Authentication/Authorization
- Rate limiting
- Request routing
- Protocol translation (REST ↔ gRPC)
- Response aggregation
- SSL termination

### Example
```
Client → API Gateway
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
[Users]   [Orders]  [Inventory]
```

## Data Consistency

### Saga Pattern
- Distributed transaction across services
- Compensating transactions on failure
- Orchestrated (central coordinator) or Choreographed (event-driven)

### Event Sourcing
- Store state changes as events
- Replay events to reconstruct state
- Audit trail built-in

### CQRS (Command Query Responsibility Segregation)
- Separate write and read models
- Commands: Change state
- Queries: Read optimized views

## Challenges

### Distributed Transactions
- No ACID across services
- Use Saga pattern
- Embrace eventual consistency

### Service Coordination
- Circuit breakers (Hystrix, Resilience4j)
- Timeouts and retries with backoff
- Bulkheads (isolate failures)

### Observability
- Distributed tracing (Jaeger, Zipkin)
- Correlation IDs
- Centralized logging (ELK)
- Metrics (Prometheus)

### Testing
- Contract testing (Pact)
- Integration tests
- Chaos engineering

## When NOT to Use

- Small team (< 10 developers)
- Simple domain
- Rapid prototyping
- Unproven product

Start with monolith, extract services when boundaries are clear.

## Migration Strategy

1. **Strangler Fig Pattern**
   - Route traffic through new service
   - Gradually replace functionality
   - Retire old code

2. **Branch by Abstraction**
   - Create abstraction layer
   - Implement new service behind it
   - Switch over

## Example: E-commerce Microservices

```
[API Gateway]
      ↓
┌─────────┬─────────┬─────────┬─────────┐
↓         ↓         ↓         ↓         ↓
[Users] [Catalog] [Cart]   [Orders] [Payment]
   ↓        ↓        ↓        ↓        ↓
[User DB][Product DB][Cart DB][Order DB][Payment DB]

Events (Async):
- OrderCreated → [Inventory] (reserve stock)
- OrderCreated → [Notification] (send email)
- PaymentCompleted → [Orders] (mark paid)
- PaymentFailed → [Inventory] (release stock)
```

## Service Mesh (Advanced)

Sidecar proxy pattern:
- Envoy, Istio, Linkerd
- Handle service-to-service communication
- mTLS, traffic management, observability

```
[Service A] ←→ [Sidecar A] ←→ [Sidecar B] ←→ [Service B]
```
