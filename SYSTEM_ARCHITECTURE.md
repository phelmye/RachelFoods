# RachelFoods: System Architecture

**Author**: Olufemi Aderinto  
**Role**: Full-Stack Software Engineer  
**Last Updated**: January 14, 2026

---

## Overview

RachelFoods is a production-grade, multi-tenant e-commerce platform architected as a modular monolith. The system handles real-money transactions, inventory management, promotional campaigns, and refund workflows with ACID guarantees. The architecture prioritizes transactional safety, operational simplicity, and horizontal scalability without premature distribution complexity.

**Core Components**:

- **Frontend**: Next.js 16 (App Router, TypeScript, Server Components)
- **Backend**: NestJS (TypeScript, modular architecture)
- **Database**: PostgreSQL 14+ with Prisma ORM
- **Payment Gateway**: Stripe PaymentIntents API with webhook verification
- **Deployment**: Vercel (frontend), Render (backend), managed PostgreSQL

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 16 App Router (Vercel)                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Server    │  │  Client    │  │  API       │                │
│  │  Components│  │  Components│  │  Routes    │                │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                │
│        │                │                │                       │
│        └────────────────┴────────────────┘                       │
│                         │                                        │
│                    HTTPS/REST                                    │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                    BACKEND LAYER                                 │
├─────────────────────────┼────────────────────────────────────────┤
│  NestJS Modular Monolith (Render)                               │
│                         │                                        │
│  ┌──────────────────────┴─────────────────────────────────┐     │
│  │              Application Module Graph                  │     │
│  │                                                         │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │     │
│  │  │  Auth    │  │  Orders  │  │ Payments │             │     │
│  │  │  Module  │  │  Module  │  │  Module  │             │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘             │     │
│  │       │             │             │                    │     │
│  │  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐             │     │
│  │  │  Users   │  │ Inventory│  │  Wallet  │             │     │
│  │  │  Module  │  │  Module  │  │  Module  │             │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘             │     │
│  │       │             │             │                    │     │
│  │  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐             │     │
│  │  │Promotion │  │  Refund  │  │  Email   │             │     │
│  │  │  Module  │  │  Module  │  │  Module  │             │     │
│  │  └──────────┘  └──────────┘  └──────────┘             │     │
│  │                                                         │     │
│  │  ┌──────────────────────────────────────────┐          │     │
│  │  │         Prisma ORM (Type-Safe)           │          │     │
│  │  └────────────────┬─────────────────────────┘          │     │
│  └───────────────────┼──────────────────────────────────────┘     │
│                      │                                        │
└──────────────────────┼────────────────────────────────────────┘
                       │
┌──────────────────────┼────────────────────────────────────────┐
│                 DATA LAYER                                     │
├──────────────────────┼────────────────────────────────────────┤
│  PostgreSQL 14+ (Managed)                                      │
│  ┌─────────────────┬────────────────┬──────────────────┐      │
│  │   Transactional │  Relational    │  Row-Level       │      │
│  │   ACID          │  Integrity     │  Locking         │      │
│  └─────────────────┴────────────────┴──────────────────┘      │
│                                                                │
│  Tables: users, products, orders, payments, wallets,          │
│          wallet_transactions, coupons, refunds                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                            │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Stripe     │  │   SendGrid   │  │   Sentry     │         │
│  │   (Payments) │  │   (Email)    │  │   (Errors)   │         │
│  └──────┬───────┘  └──────────────┘  └──────────────┘         │
│         │                                                       │
│         └─── Webhooks (signature verified) ────────────────►   │
└────────────────────────────────────────────────────────────────┘
```

---

## Architectural Decisions

### 1. Modular Monolith vs. Microservices

**Decision**: Modular monolith with clear module boundaries.

**Rationale**:

- **Transactional Integrity**: Payment, inventory, and wallet operations require ACID guarantees across multiple tables. Distributed transactions (2PC, Sagas) introduce complexity and failure modes that are unnecessary at current scale.
- **Operational Simplicity**: Single deployment unit, single database connection pool, unified logging, and simplified debugging. No service mesh, no inter-service authentication, no network partition handling.
- **Developer Velocity**: Refactoring across module boundaries is trivial (move imports). In microservices, this requires API versioning, backward compatibility, and deployment orchestration.
- **Cost Efficiency**: One backend instance, one database. Microservices would require multiple instances, load balancers, and inter-service communication overhead.

**When to Migrate**:

- Individual modules (payments, inventory) become CPU or memory bottlenecks
- Team size exceeds 15 engineers (module ownership becomes critical)
- Regulatory requirements mandate service isolation (PCI compliance for payment service)

**Scalability Strategy**:
Current architecture supports horizontal scaling by deploying multiple backend instances behind a load balancer. Stateless design (JWT tokens, no server-side sessions) enables this without code changes.

---

### 2. Frontend Architecture: Next.js App Router

**Decision**: Server Components by default, Client Components only for interactivity.

**Component Strategy**:

```
app/
├── (auth)/          # Server-rendered auth pages
├── catalog/         # Server Components (product list, details)
├── checkout/        # Client Component (payment form, Stripe Elements)
├── dashboard/       # Mixed (server data fetching, client interactions)
└── admin/           # Client Components (real-time order management)
```

**Server Components Benefits**:

- **Reduced JavaScript Bundle**: Product catalog, order history, and static pages ship zero JavaScript to client
- **Direct Database Access**: Server Components can call backend APIs or database directly (via API routes)
- **SEO Optimization**: Product pages are fully server-rendered with metadata

**Client Components Use Cases**:

- Payment forms (Stripe Elements requires client-side mounting)
- Admin dashboards (inline order status updates, real-time filtering)
- Shopping cart (interactive quantity adjustments)

**Data Fetching**:

- Server Components: Direct API calls via `fetch()` with automatic deduplication
- Client Components: React hooks (useState, useEffect) for dynamic data

---

### 3. Backend Architecture: NestJS Modules

**Module Design Principles**:

1. **Single Responsibility**: Each module owns a specific domain (orders, payments, users)
2. **Dependency Injection**: Services are injected via constructor, enabling testability
3. **Explicit Exports**: Modules export only public APIs, hiding internal implementation
4. **Circular Dependencies**: Handled via `forwardRef()` where necessary (OrderModule ↔ PaymentModule)

**Module Dependency Graph**:

```
AuthModule (no dependencies)
  ↓
UserModule (imports: AuthModule)
  ↓
ProductModule (imports: AuthModule)
  ↓
OrderModule (imports: AuthModule, ProductModule, InventoryModule)
  ↓
PaymentModule (imports: AuthModule, OrderModule, WalletModule)
  ↓
RefundModule (imports: AuthModule, OrderModule, PaymentModule, WalletModule)
```

**Critical Services**:

- `OrderService`: Order creation with inventory locking
- `StripePaymentService`: Payment processing with webhook verification
- `WalletService`: Wallet transactions with ACID guarantees
- `KitchenRefillService`: Inventory management with oversell prevention

---

### 4. Database: PostgreSQL + Prisma ORM

**Why PostgreSQL**:

- **ACID Transactions**: Essential for payment and wallet operations
- **Row-Level Locking**: `SELECT ... FOR UPDATE` prevents concurrent inventory modification
- **Relational Integrity**: Foreign keys enforce referential integrity (orders → users, payments → orders)
- **Performance**: Indexed queries on userId, orderId, productId, status fields

**Why Prisma**:

- **Type Safety**: Auto-generated TypeScript types from schema (compile-time error detection)
- **Migration System**: Version-controlled schema changes with rollback support
- **Transaction API**: `prisma.$transaction()` ensures atomic multi-step operations
- **Query Optimization**: Automatic query batching, connection pooling

**Schema Highlights**:

```prisma
model orders {
  id            String   @id @default(cuid())
  buyerId       String
  status        OrderStatus
  paymentStatus PaymentStatus
  total         Float
  createdAt     DateTime @default(now())

  buyer         users    @relation(fields: [buyerId], references: [id])
  order_items   order_items[]
  payments      payments[]
  refunds       refunds[]

  @@index([buyerId, status])
  @@index([createdAt])
}

model wallet_transactions {
  id          String   @id @default(cuid())
  walletId    String
  type        TransactionType // CREDIT | DEBIT
  amount      Float
  reason      String
  createdAt   DateTime @default(now())

  wallet      wallets  @relation(fields: [walletId], references: [id])

  @@index([walletId, createdAt])
}
```

**Index Strategy**:

- Composite indexes on frequently queried columns (buyerId + status)
- Single-column indexes on foreign keys and timestamp fields
- No premature optimization (indexes added based on query patterns)

---

### 5. Payment Architecture: Stripe PaymentIntents

**Decision**: PaymentIntents with webhook confirmation (not Checkout Sessions).

**Why PaymentIntents**:

- **Custom Checkout UI**: Full control over branding, upsells, and coupon application
- **Wallet Integration**: Can combine wallet credit + Stripe payment in single transaction
- **3D Secure Support**: Built-in Strong Customer Authentication (SCA) compliance
- **Webhook Reliability**: Asynchronous payment confirmation via `payment_intent.succeeded`

**Payment Flow**:

```
1. Frontend: User initiates checkout
2. Backend: Create PaymentIntent (amount, currency, metadata: {orderId})
3. Backend: Return clientSecret to frontend
4. Frontend: Confirm payment with Stripe.js (3D Secure if required)
5. Stripe: Send payment_intent.succeeded webhook
6. Backend: Verify webhook signature (HMAC-SHA256)
7. Backend: Update order status (PENDING → PAID)
8. Backend: Send order confirmation email
```

**Idempotency**:

- Check for existing PaymentIntent before creating new one (prevent double charges)
- Webhook events processed only once (idempotency key stored in `payments` table)

**Security**:

- Webhook signature verification (prevents replay attacks)
- No raw card data handled (Stripe.js tokenizes on client)
- PaymentIntent metadata signed by backend (prevents amount tampering)

---

## Scalability Without Complexity

### Horizontal Scaling

**Current**: Single backend instance (sufficient for 1000 concurrent users)  
**Future**: Deploy N backend instances behind load balancer

**Requirements**:

- Stateless design (JWT tokens, no server-side sessions)
- Shared database (all instances connect to same PostgreSQL)
- Shared cache (Redis for featured/popular products)

**No Code Changes Required**.

### Database Scaling

**Current**: Single PostgreSQL instance (16 GB RAM, 4 vCPU)  
**Vertical Scaling**: Increase instance size (32 GB RAM, 8 vCPU)  
**Read Replicas**: Route read-only queries (product catalog, order history) to replicas

**Connection Pooling**:
Prisma maintains connection pool (default: 10 connections per instance). Under load, increase pool size or use PgBouncer.

### Caching Strategy

**Current**: In-memory cache (5-minute TTL for featured/popular products)  
**Future**: Redis cluster for distributed caching

**Cache Invalidation**:

- Product updates invalidate cache immediately
- Order creation does NOT invalidate product cache (eventual consistency acceptable)

---

## Key Tradeoffs

| Decision              | Benefit                                         | Cost                                                                |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Modular Monolith      | Transactional integrity, operational simplicity | Less independent scalability per module                             |
| Server Components     | Reduced client JavaScript, faster page loads    | Learning curve, requires Next.js 13+                                |
| Prisma ORM            | Type safety, auto-generated types               | Abstraction overhead, manual query optimization for complex queries |
| Stripe PaymentIntents | Custom checkout, wallet integration             | More frontend complexity vs. Checkout Sessions                      |
| JWT Authentication    | Stateless, horizontal scaling                   | No built-in token revocation (mitigated by 7-day expiry)            |

---

## Security Architecture

### Authentication & Authorization

- **JWT Tokens**: Signed with HS256, 7-day expiration
- **Password Hashing**: bcrypt with salt rounds = 10
- **Role-Based Access Control (RBAC)**: BUYER, STAFF, ADMIN roles
- **Permission Guards**: NestJS guards enforce role checks on protected routes

### API Security

- **CORS**: Whitelist-only origins (no wildcard)
- **Rate Limiting**: Global (100 req/min per IP), per-endpoint (login: 5/15min, payments: 10/min)
- **Input Validation**: DTOs with `class-validator` on all endpoints
- **SQL Injection**: Prisma parameterized queries (no raw SQL)

### Payment Security

- **Webhook Verification**: Stripe signature validation (HMAC-SHA256)
- **Idempotency**: Duplicate payment prevention
- **No Card Data**: Stripe.js handles tokenization (PCI DSS compliance)

---

## Monitoring & Observability

### Logging

- **Structured Logs**: Winston with JSON formatting
- **Correlation IDs**: Unique requestId for tracing requests across services
- **Log Levels**: ERROR (production), DEBUG (development)

### Error Tracking

- **Sentry**: Automatic exception reporting with stack traces
- **User Context**: UserId, orderId, paymentId attached to error events

### Metrics

- **Health Checks**: `/api/health` endpoint (database connectivity, cache status)
- **Business Metrics**: Order count, revenue, payment success rate, refund rate
- **System Metrics**: Response time, error rate, database connection pool usage

---

## Technology Stack Summary

| Layer          | Technology     | Version | Purpose                                    |
| -------------- | -------------- | ------- | ------------------------------------------ |
| Frontend       | Next.js        | 16      | Server/Client Components, App Router       |
| UI Library     | React          | 18      | Component library                          |
| Styling        | Tailwind CSS   | 3.x     | Utility-first CSS                          |
| Backend        | NestJS         | 10      | Modular TypeScript framework               |
| ORM            | Prisma         | 5.x     | Type-safe database access                  |
| Database       | PostgreSQL     | 14+     | Relational database with ACID              |
| Payments       | Stripe         | Latest  | Payment processing, webhooks               |
| Authentication | JWT            | N/A     | Stateless authentication                   |
| Logging        | Winston        | 3.x     | Structured logging                         |
| Error Tracking | Sentry         | Latest  | Exception monitoring                       |
| Deployment     | Vercel, Render | N/A     | Serverless frontend, containerized backend |

---

## Future Architecture Evolution

### Phase 8: Testing & Quality Assurance

- Unit tests (Jest) for service layer
- Integration tests for API endpoints
- E2E tests (Playwright) for critical user flows

### Phase 9: Performance & Scalability

- Redis caching (replace in-memory)
- Database query optimization (N+1 query fixes)
- CDN integration for static assets

### Phase 10: Advanced Features

- JWT refresh tokens
- 2FA for admin users
- WebSocket for real-time dashboard updates

### Phase 11: Multi-Vendor Marketplace

- Vendor onboarding module
- Stripe Connect for split payments
- Per-vendor dashboards and analytics

---

**Author**: Olufemi Aderinto  
**GitHub**: [rachelfuud/rachelfoods](https://github.com/rachelfuud/rachelfoods)  
**Last Updated**: January 14, 2026
