# System Design: Chat System (like WhatsApp)

## Overview
Real-time messaging platform supporting 1:1 and group chats.

---

## Step 1: Requirements & Constraints

### Functional Requirements
- 1:1 messaging (text, media)
- Group chats (up to 500 members)
- Online/offline status
- Message history
- Read receipts
- Typing indicators

### Non-Functional Requirements
- **Scale**: 1B DAU, 50B messages/day
- **Latency**: < 200ms message delivery
- **Availability**: 99.99% (4 nines)
- **Consistency**: Messages must not be lost

### Back-of-the-Envelope

| Metric | Calculation | Result |
|--------|-------------|--------|
| Messages/day | 50B | ~580K/sec |
| Peak messages | 2× average | ~1.2M/sec |
| Storage/day | 50B × 100 bytes | 5 TB/day |
| Storage/year | 5 TB × 365 | 1.8 PB/year |

---

## Step 2: High-Level Design

```
[Client A] ←WebSocket→ [Load Balancer] ←WebSocket→ [Client B]
                            ↓
                    [Chat Servers (Cluster)]
                            ↓
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
          [Database]   [Cache]       [Message Queue]
              ↓             ↓             ↓
          [File Store]  [Presence]    [Push Notification]
```

### Components
1. **WebSocket Servers**: Real-time bidirectional communication
2. **API Servers**: REST endpoints for history, profile
3. **Database**: Message persistence
4. **Cache**: Online status, recent messages
5. **Message Queue**: Async processing, delivery
6. **File Storage**: Media files
7. **Push Notification**: APNS/FCM for offline users

---

## Step 3: Core Components

### Real-Time Communication

**WebSocket for Active Users**
- Persistent connection
- Low latency
- Bi-directional

**Connection Flow:**
```
1. Client authenticates
2. Opens WebSocket to nearest server
3. Server maintains connection map: user_id → connection
4. Heartbeat every 30s to detect disconnections
```

**Handling Disconnections:**
- Client reconnects automatically
- Server buffers messages for offline users
- Deliver on reconnection

### Message Flow (1:1)

```
User A → WS Server 1 → Message Service → Database
                          ↓
                    User B online?
                    ├── Yes → WS Server 2 → User B
                    └── No → Queue → Push Notification
```

**Message Structure:**
```json
{
  "message_id": "uuid",
  "sender_id": "user_a",
  "receiver_id": "user_b",
  "chat_id": "chat_a_b",
  "content": "Hello!",
  "content_type": "text",
  "timestamp": 1234567890,
  "status": "sent|delivered|read"
}
```

### Group Chat Design

**Fan-out on Write (Small Groups < 100)**
- Write message to group
- Fan out to all members' inboxes
- Pros: Fast read (just query inbox)
- Cons: O(n) writes

**Fan-out on Read (Large Groups > 100)**
- Store message once
- Query group messages on read
- Pros: O(1) write
- Cons: Slower read, more DB load

**Hybrid Approach:**
```
Small groups (< 100): Fan-out on write
Large groups (100-500): Fan-out on read
```

### Database Schema

```sql
-- Users
CREATE TABLE users (
  user_id BIGINT PRIMARY KEY,
  username VARCHAR(32) UNIQUE,
  status ENUM('online', 'offline', 'away'),
  last_seen TIMESTAMP
);

-- Chats (1:1 and groups)
CREATE TABLE chats (
  chat_id BIGINT PRIMARY KEY,
  chat_type ENUM('direct', 'group'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Chat Members
CREATE TABLE chat_members (
  chat_id BIGINT,
  user_id BIGINT,
  joined_at TIMESTAMP,
  role ENUM('admin', 'member'),
  PRIMARY KEY (chat_id, user_id)
);

-- Messages
CREATE TABLE messages (
  message_id BIGINT PRIMARY KEY,
  chat_id BIGINT,
  sender_id BIGINT,
  content TEXT,
  content_type ENUM('text', 'image', 'video', 'file'),
  created_at TIMESTAMP,
  INDEX idx_chat_time (chat_id, created_at)
);

-- Message Status (read receipts)
CREATE TABLE message_status (
  message_id BIGINT,
  user_id BIGINT,
  status ENUM('delivered', 'read'),
  updated_at TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);
```

**Sharding Strategy:**
- Shard by `chat_id` hash
- All messages for a chat on same shard
- Ensures consistent ordering

### Online Presence

**Redis for Presence:**
```
Key: presence:user:{user_id}
Value: { "status": "online", "server": "ws-1", "last_seen": 1234567890 }
TTL: 60 seconds (refreshed by heartbeat)
```

**Status Updates:**
- User connects → Set status = "online"
- Heartbeat every 30s → Refresh TTL
- Disconnect → TTL expires → Status = "offline"

**Broadcast Status Changes:**
- Publish to pub/sub channel
- Friends' clients receive update

### Media Storage

**Flow:**
```
1. Client uploads to temporary URL
2. Server validates, processes (resize, compress)
3. Store in Object Storage (S3)
4. Store metadata in database
5. Send message with media URL
```

**Storage Calculation:**
- Average image: 200 KB
- Average video: 5 MB
- 10B messages/day × 20% media = 2B media/day
- Storage: ~200 PB/year

**CDN:**
- Cache media at edge
- Reduce latency and origin load

---

## Step 4: Scaling

### WebSocket Server Scaling

**Problem:**
- 1M concurrent connections per server (rough limit)
- 100M online users → need 100+ servers

**Solution:**
- Sticky load balancing (user → consistent server)
- Or use Redis to track user → server mapping

**Cross-Server Messaging:**
```
User A on Server 1 → Redis Pub/Sub → Server 2 → User B
```

### Database Scaling

**Write Heavy:**
- 1.2M messages/sec writes
- Single DB can't handle

**Solution:**
- Sharding by chat_id
- 256 shards
- Each shard: ~5K writes/sec (manageable)

**Read Scaling:**
- Recent messages in cache (Redis)
- Historical messages from DB
- Read replicas for history queries

### Message Delivery Guarantees

**At-Least-Once Delivery:**
1. Client sends message
2. Server acks receipt
3. Server stores to DB
4. Server attempts delivery
5. Receiver acks delivery
6. If no ack, retry

**Exactly-Once Semantics:**
- Message deduplication by message_id
- Client generates UUID
- Server ignores duplicates

---

## Trade-offs

| Decision | Chosen | Reason |
|----------|--------|--------|
| Transport | WebSocket | Real-time, bidirectional |
| Group chats | Hybrid fan-out | Balance read/write |
| Presence | Redis | Fast, TTL support |
| Media | Object Store | Scalable, cheap |
| Delivery | At-least-once + dedup | Reliable, not overly complex |

---

## Failure Handling

| Failure | Mitigation |
|---------|------------|
| WS server crash | Client reconnects to new server, buffered messages delivered |
| DB shard down | Queue messages, replay when recovered |
| Message lost | Retry with exponential backoff |
| Partition (CAP) | Choose availability, eventual consistency |
