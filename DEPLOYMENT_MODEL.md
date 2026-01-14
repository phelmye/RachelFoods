# RachelFoods: Deployment Model

**Author**: Olufemi Aderinto  
**Role**: Full-Stack Software Engineer  
**Last Updated**: January 14, 2026

---

## Overview

RachelFoods uses a multi-environment deployment strategy with separate frontend and backend hosting providers. The architecture prioritizes developer velocity, cost efficiency, and production safety through automated deployments, environment isolation, and secrets management.

**Deployment Stack**:

- **Frontend**: Vercel (serverless Next.js)
- **Backend**: Render (containerized NestJS)
- **Database**: Render PostgreSQL (managed service)
- **Payments**: Stripe (SaaS)
- **Email**: SendGrid/Console (development fallback)

---

## Environment Strategy

### Development

**Purpose**: Local development and testing.

**Configuration**:

- Frontend: `http://localhost:3000` (Next.js dev server)
- Backend: `http://localhost:4000` (NestJS dev server)
- Database: Local PostgreSQL instance or Docker container
- Stripe: Test mode API keys (`sk_test_...`)
- Email: Console output (no actual emails sent)

**Database Setup**:

```bash
# Start PostgreSQL via Docker
docker run --name rachelfoods-db \
  -e POSTGRES_USER=rachelfoods \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=rachelfoods_dev \
  -p 5432:5432 \
  -d postgres:14

# Run migrations
cd backend
npx prisma migrate dev
npx prisma db seed
```

**Environment Variables** (`.env.local`):

```bash
# Database
DATABASE_URL="postgresql://rachelfoods:devpassword@localhost:5432/rachelfoods_dev"

# JWT
JWT_SECRET="dev-secret-change-in-production"

# Stripe (Test Mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."

# Email (Console Mode)
EMAIL_PROVIDER="console"

# Frontend API URL
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

**Developer Workflow**:

1. Clone repository
2. Copy `.env.example` to `.env` (backend and frontend)
3. Run `npm install` in both directories
4. Start database (Docker or local PostgreSQL)
5. Run migrations: `npx prisma migrate dev`
6. Seed database: `npx prisma db seed`
7. Start backend: `npm run start:dev`
8. Start frontend: `npm run dev`

---

### Staging

**Purpose**: Pre-production testing, client demos, QA validation.

**Configuration**:

- Frontend: `https://staging.rachelfoods.com` (Vercel preview deployment)
- Backend: `https://rachelfoods-staging.onrender.com` (Render web service)
- Database: Render PostgreSQL (separate staging database)
- Stripe: Test mode API keys (`sk_test_...`)
- Email: SendGrid with `[STAGING]` prefix in subject lines

**Deployment Trigger**:

- Git branch: `develop`
- Automatic deployment on push to `develop`
- Preview deployments for pull requests

**Database Strategy**:

- Separate staging database (isolated from production)
- Reset weekly (automated script on Sunday 00:00 UTC)
- Seeded with realistic test data (anonymized production data)

**Environment Variables** (Render dashboard):

```bash
DATABASE_URL="postgresql://user:pass@staging-db.render.com:5432/rachelfoods_staging"
JWT_SECRET="staging-jwt-secret-different-from-prod"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="SG.staging_..."
NODE_ENV="staging"
```

**Access Control**:

- Password-protected frontend (Vercel password protection)
- Backend requires `Authorization: Bearer <staging-token>` for admin routes
- IP whitelist for admin dashboard (office/VPN IPs only)

---

### Production

**Purpose**: Live system serving real customers and processing real payments.

**Configuration**:

- Frontend: `https://rachelfoods.com` (Vercel production deployment)
- Backend: `https://api.rachelfoods.com` (Render web service with custom domain)
- Database: Render PostgreSQL (16 GB RAM, 4 vCPU, automated daily backups)
- Stripe: Live mode API keys (`sk_live_...`)
- Email: SendGrid (production account)

**Deployment Trigger**:

- Git branch: `main`
- Manual deployment approval required (GitHub Actions workflow)
- Zero-downtime deployment (Render rolling updates)

**Database Configuration**:

- **Instance Size**: 16 GB RAM, 4 vCPU
- **Backups**: Daily automated backups (retained for 30 days)
- **Point-in-Time Recovery**: Enabled (5-minute granularity)
- **Connection Limit**: 100 concurrent connections
- **Connection Pooling**: Prisma connection pool (10 connections per backend instance)

**Environment Variables** (Render dashboard):

```bash
# Database
DATABASE_URL="postgresql://user:pass@prod-db.render.com:5432/rachelfoods_prod"

# JWT (strong secret, rotated quarterly)
JWT_SECRET="prod-jwt-secret-min-32-chars-alphanumeric"

# Stripe (Live Mode)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_live_..."

# Email (Production SendGrid)
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="SG.prod_..."

# Monitoring
SENTRY_DSN="https://...@sentry.io/..."

# CORS (Production Domains Only)
ALLOWED_ORIGINS="https://rachelfoods.com,https://www.rachelfoods.com"

# Node Environment
NODE_ENV="production"
```

**Scaling Configuration**:

- Backend instances: 2 (horizontal scaling with load balancer)
- Auto-scaling: Enabled (2-5 instances based on CPU usage > 70%)
- Health check: `/api/health` (30-second interval)

---

## Frontend Deployment (Vercel)

### Build Configuration

**Framework**: Next.js 16 (App Router)  
**Build Command**: `npm run build`  
**Output Directory**: `.next`  
**Install Command**: `npm install`

**Environment Variables**:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL="https://api.rachelfoods.com"

# Stripe Publishable Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-..."
```

**Deployment Process**:

1. Push to `main` branch
2. Vercel detects commit via GitHub webhook
3. Build triggered automatically
4. Build logs available in Vercel dashboard
5. Deployment goes live at `rachelfoods.com` (0-5 seconds propagation)

**Domain Configuration**:

- Primary: `rachelfoods.com` (A record → Vercel IP)
- WWW: `www.rachelfoods.com` (CNAME → cname.vercel-dns.com)
- SSL: Auto-provisioned by Vercel (Let's Encrypt)
- CDN: Vercel Edge Network (global distribution)

**Caching Strategy**:

- Static assets: 1 year cache (`Cache-Control: public, max-age=31536000, immutable`)
- API routes: No cache (`Cache-Control: no-store`)
- Server Components: Revalidated on build

---

## Backend Deployment (Render)

### Build Configuration

**Service Type**: Web Service (Docker)  
**Region**: Oregon, USA (us-west-2)  
**Instance Type**: Standard (1 GB RAM, 0.5 vCPU per instance)  
**Auto-Deploy**: Enabled (on push to `main`)

**Build Command**:

```bash
npm install
npm run build
npx prisma generate
npx prisma migrate deploy
```

**Start Command**:

```bash
npm run start:prod
```

**Health Check**:

- Endpoint: `/api/health`
- Expected Response: 200 OK with JSON body `{ "status": "healthy" }`
- Interval: 30 seconds
- Timeout: 10 seconds
- Failure Threshold: 3 consecutive failures

**Dockerfile** (if using custom Docker image):

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "start:prod"]
```

**Deployment Process**:

1. Push to `main` branch
2. Render detects commit via GitHub webhook
3. Build phase: Install dependencies, compile TypeScript, generate Prisma client
4. Database migration: `npx prisma migrate deploy`
5. Health check validation
6. Rolling update: New instances start, old instances drain connections
7. Zero-downtime deployment (traffic shifted gradually)

**Rollback Procedure**:

```bash
# Via Render dashboard:
1. Navigate to "Deploys" tab
2. Select previous deployment
3. Click "Redeploy"
4. Confirm rollback

# Via Render CLI:
render rollback --service rachelfoods-backend --commit <previous-commit-sha>
```

---

## Database Deployment (Render PostgreSQL)

### Instance Configuration

- **Type**: PostgreSQL 14.x
- **Plan**: Standard (16 GB RAM, 4 vCPU, 256 GB SSD)
- **Region**: Oregon, USA (same as backend for low latency)
- **Backups**: Daily at 02:00 UTC (retained for 30 days)
- **High Availability**: Multi-AZ replication (automatic failover)

### Migration Strategy

**Tool**: Prisma Migrate  
**Approach**: Declarative schema with migration history

**Migration Workflow**:

1. Developer creates schema change in `schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name` (local)
3. Test migration in development environment
4. Commit migration files (`prisma/migrations/`) to Git
5. Push to `main` branch
6. Render runs `npx prisma migrate deploy` during deployment
7. Migration applied to production database

**Rollback Strategy**:

- Forward-only migrations (no automatic rollback)
- Manual rollback requires:
  1. Restore database from backup (Point-in-Time Recovery)
  2. Redeploy backend with previous commit
  3. Re-run migrations from restored backup point

**Critical Migration Rules**:

- Never drop columns with existing data (add deprecation notice first)
- Always add columns as nullable initially (backfill data before making NOT NULL)
- Test migrations on staging database with production-like data volume

### Connection Management

**Connection String Format**:

```
postgresql://user:password@host:5432/database?schema=public&connection_limit=10
```

**Connection Pooling**:

- Prisma maintains connection pool per backend instance
- Default pool size: 10 connections
- Max pool size: 100 connections (total across all instances)
- Idle timeout: 60 seconds

**Monitoring**:

- Active connections: Render dashboard (real-time graph)
- Query performance: `pg_stat_statements` extension
- Slow query log: Queries > 1 second logged automatically

---

## Stripe Configuration

### Webhook Endpoints

**Development**:

```
URL: https://ngrok-tunnel.io/api/payments/stripe/webhook
Secret: whsec_test_...
Events: payment_intent.succeeded, payment_intent.payment_failed
```

**Staging**:

```
URL: https://rachelfoods-staging.onrender.com/api/payments/stripe/webhook
Secret: whsec_test_...
Events: payment_intent.succeeded, payment_intent.payment_failed
```

**Production**:

```
URL: https://api.rachelfoods.com/api/payments/stripe/webhook
Secret: whsec_live_...
Events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
```

**Webhook Security**:

- Signature verification required (HMAC-SHA256)
- Raw request body preserved for signature validation
- Idempotency checks prevent duplicate processing
- Failed webhooks logged to Sentry

**Testing Webhooks Locally**:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:4000/api/payments/stripe/webhook

# Trigger test webhook
stripe trigger payment_intent.succeeded
```

---

## Secrets Management

### Development

- Secrets stored in `.env` files (never committed to Git)
- `.env.example` files provide template with placeholder values
- Developers generate own Stripe test keys from Stripe dashboard

### Staging & Production

- Secrets stored in Render dashboard (encrypted at rest)
- Environment variable updates trigger automatic redeploy
- Secrets never logged or exposed in API responses

**Secret Rotation Schedule**:

- JWT Secret: Every 90 days
- Stripe Webhook Secret: When compromised or annually
- Database Password: Every 180 days (coordinated with backend redeploy)
- SendGrid API Key: When compromised or annually

**Rotation Procedure** (JWT Secret):

1. Generate new secret: `openssl rand -hex 32`
2. Add new secret to Render dashboard as `JWT_SECRET_NEW`
3. Update backend to accept both old and new secrets (grace period)
4. Deploy backend
5. Wait 7 days (token expiry duration)
6. Remove old secret from environment variables
7. Rename `JWT_SECRET_NEW` to `JWT_SECRET`

---

## Deployment Checklist

### Pre-Deployment (Staging)

- [ ] All tests pass (`npm test`)
- [ ] Backend builds successfully (`npm run build`)
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Database migrations tested on staging database
- [ ] Environment variables updated in Render dashboard
- [ ] Stripe webhook endpoint configured
- [ ] CORS allowed origins include staging domain
- [ ] Rate limiting tested (load testing with JMeter or k6)

### Pre-Deployment (Production)

- [ ] Staging deployment tested for 24 hours (no critical errors)
- [ ] Database backup verified (restore test completed)
- [ ] Rollback plan documented
- [ ] On-call engineer designated
- [ ] Sentry error tracking configured
- [ ] Stripe webhook endpoint switched to production URL
- [ ] CORS allowed origins include production domains only
- [ ] Rate limiting thresholds reviewed (prevent DDoS)
- [ ] Database connection pool size validated
- [ ] Health check endpoint responding correctly

### Post-Deployment (Production)

- [ ] Monitor error rate (Sentry dashboard) for 30 minutes
- [ ] Verify payment flow (place test order with real Stripe card)
- [ ] Check order confirmation emails sent
- [ ] Validate admin dashboard accessible
- [ ] Review backend logs (no unexpected errors)
- [ ] Test wallet credit/debit operations
- [ ] Verify coupon application
- [ ] Test refund workflow
- [ ] Monitor database connection count
- [ ] Check Stripe webhook delivery (99%+ success rate)

---

## Monitoring & Alerting

### Health Checks

- **Frontend**: Vercel monitors build status and edge network health
- **Backend**: Render monitors `/api/health` endpoint every 30 seconds
- **Database**: Render monitors connection count, disk usage, CPU usage

### Error Tracking

- **Sentry**: Automatic exception reporting with stack traces
- **Slack Integration**: Critical errors posted to `#engineering-alerts` channel
- **Alert Thresholds**:
  - Error rate > 5% (10-minute window)
  - Payment webhook failure > 1% (10-minute window)
  - Database connection pool exhausted (> 90% utilization)

### Performance Monitoring

- **Response Time**: P50, P95, P99 tracked via Render metrics
- **Database Queries**: Slow queries (> 1 second) logged automatically
- **Cache Hit Rate**: Featured/popular products cache monitored

### Business Metrics

- **Orders**: Created, paid, shipped, delivered, refunded
- **Revenue**: Daily, weekly, monthly totals
- **Payment Success Rate**: % of PaymentIntents that succeed
- **Refund Rate**: % of orders refunded

---

## Incident Response

### Severity Levels

- **P0 (Critical)**: Payments failing, site down, data corruption
- **P1 (High)**: Admin dashboard inaccessible, webhook failures
- **P2 (Medium)**: Non-critical API errors, slow response times
- **P3 (Low)**: UI bugs, documentation errors

### P0 Response Plan

1. **Detect**: Automated alert via Sentry/Render
2. **Triage**: On-call engineer investigates (< 5 minutes)
3. **Mitigate**: Rollback to previous deployment if needed
4. **Resolve**: Fix root cause, deploy hotfix
5. **Post-Mortem**: Document incident, update runbook

### Rollback Triggers

- Error rate > 10% (sustained for 5 minutes)
- Payment success rate < 90% (sustained for 5 minutes)
- Database connection pool exhausted
- Health check failures (3 consecutive failures)

---

## Cost Optimization

### Current Monthly Costs (Estimated)

- Vercel (Pro Plan): $20/month
- Render Backend (Standard): $25/month × 2 instances = $50/month
- Render Database (Standard): $90/month
- Stripe (Transaction Fees): 2.9% + $0.30 per transaction
- SendGrid (Essentials): $20/month (up to 100k emails)
- **Total Infrastructure**: ~$180/month (excluding Stripe transaction fees)

### Scaling Cost Projections

- 10,000 orders/month: ~$180/month
- 100,000 orders/month: ~$500/month (5 backend instances, larger database)
- 1,000,000 orders/month: ~$3,000/month (20 backend instances, read replicas, Redis cache)

---

**Author**: Olufemi Aderinto  
**GitHub**: [rachelfuud/rachelfoods](https://github.com/rachelfuud/rachelfoods)  
**Last Updated**: January 14, 2026
