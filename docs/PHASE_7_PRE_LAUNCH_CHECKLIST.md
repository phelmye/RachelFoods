# PHASE 7: PRE-LAUNCH CHECKLIST

**Date**: January 13, 2026  
**Purpose**: Production Launch Readiness Verification

---

## Environment & Secrets ✅

### Backend Environment Variables

- [ ] `DATABASE_URL` - Production PostgreSQL connection string configured
- [ ] `JWT_SECRET` - Strong secret (min 32 characters, cryptographically random)
- [ ] `JWT_EXPIRATION` - Set to appropriate value (default: 7d)
- [ ] `STRIPE_SECRET_KEY` - Production Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret configured
- [ ] `PORT` - Production port (default: 3001)
- [ ] `NODE_ENV` - Set to `production`

### Frontend Environment Variables

- [ ] `NEXT_PUBLIC_API_URL` - Production backend URL (e.g., https://api.rachelfoods.com)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Production Stripe publishable key
- [ ] `NODE_ENV` - Set to `production`

### Security Validation

- [ ] **NO hardcoded secrets in codebase** ✅
- [ ] **NO sensitive data in git history**
- [ ] `.env` files added to `.gitignore`
- [ ] `.env.example` files up to date
- [ ] Environment variables loaded from secure vault (AWS Secrets Manager, Render secrets, etc.)

---

## Security Hardening ✅

### Authentication & Authorization

- [x] JWT authentication on all protected endpoints
- [x] Role-based access control (ADMIN, STAFF, BUYER)
- [x] Permission-based guards on sensitive operations
- [x] JWT expiration set (7 days)
- [ ] **TODO**: JWT refresh token mechanism (optional for v1)

### Rate Limiting

- [x] Global rate limiting: 100 requests per 60 seconds per IP
- [ ] **CRITICAL**: Verify rate limiting works in production (behind load balancer/proxy)
- [ ] **RECOMMENDATION**: Add stricter limits for:
  - Auth endpoints: 5 login attempts per 15 minutes
  - Payment endpoints: 10 requests per minute
  - Refund endpoints: 5 requests per minute
  - Admin mutations: 20 requests per minute

### Payment Security

- [x] Stripe webhook signature verification
- [x] Payment amount validation
- [x] Order ownership verification before payment
- [x] Double-payment prevention (check existing successful payments)
- [ ] **TODO**: Add payment retry limits (max 3 attempts per order)

### Input Validation

- [x] DTOs with class-validator on all endpoints
- [x] Prisma parameterized queries (SQL injection safe)
- [ ] **RECOMMENDATION**: Add request size limits (prevent DOS)

### CORS Configuration

- [ ] **CRITICAL**: Update CORS to whitelist only production domains
  ```typescript
  // In main.ts - REPLACE wildcard with specific origins
  app.enableCors({
    origin: ["https://rachelfoods.com", "https://www.rachelfoods.com"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });
  ```

---

## Error Handling & Logging ✅

### Exception Handling

- [x] Global exception filter catches all errors
- [x] Stack traces **NOT exposed** to clients (logged server-side only)
- [x] User-friendly error messages
- [x] Prisma errors translated to user messages
- [x] HTTP status codes correct

### Logging

- [x] Winston structured logging configured
- [x] Request/response logging with correlation IDs
- [x] Sensitive data sanitized (passwords, tokens)
- [x] Error logging includes context (userId, requestId, path)
- [ ] **TODO**: Configure log aggregation (Datadog, Loggly, CloudWatch)

### Monitoring

- [ ] **CRITICAL**: Set up application monitoring (New Relic, Datadog, or Sentry)
- [ ] **CRITICAL**: Set up error tracking (Sentry DSN configured)
- [ ] Health check endpoint monitored (`/api/health`)
- [ ] Database connection pooling monitored
- [ ] Payment webhook failures monitored

---

## Database & Data Integrity

### Schema Validation

- [x] Prisma schema validated
- [x] Foreign key constraints in place
- [x] Unique constraints on critical fields
- [ ] **TODO**: Run database migration in production
  ```bash
  npx prisma migrate deploy
  ```

### Data Backup

- [ ] **CRITICAL**: Automated database backups configured
- [ ] Backup retention policy defined (30 days recommended)
- [ ] Backup restoration tested

### Seed Data

- [ ] Admin user seeded in production
  ```bash
  ADMIN_EMAIL=admin@rachelfoods.com ADMIN_PASSWORD=<strong-password> npm run seed:admin
  ```
- [ ] Initial categories seeded
- [ ] Test products **REMOVED** from production

---

## Performance Optimization

### Caching

- [x] In-memory cache for featured/popular products (5-min TTL)
- [ ] **RECOMMENDATION**: Add Redis for distributed caching in production

### Database Optimization

- [ ] Database indexes created for:
  - `users.email` (unique)
  - `orders.buyerId` (lookup by user)
  - `orders.orderNumber` (order tracking)
  - `products.categoryId` (catalog queries)
  - `payment_transactions.orderId` (payment lookups)

### Frontend Optimization

- [x] Next.js static generation for catalog pages
- [x] Image optimization with Next.js Image component
- [ ] **TODO**: CDN configured for static assets (Vercel, Cloudflare)

---

## Deployment Configuration

### Backend (Render/Railway/Heroku)

- [ ] Build command: `npm run build`
- [ ] Start command: `npm run start:prod`
- [ ] Health check endpoint: `/api/health`
- [ ] Auto-deploy on main branch push
- [ ] Environment variables configured in hosting platform

### Frontend (Vercel/Netlify)

- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Node version: 18.x or 20.x
- [ ] Environment variables configured

### Domain & SSL

- [ ] Custom domain configured
- [ ] SSL certificate active (HTTPS)
- [ ] DNS records propagated
- [ ] Redirects configured (www → non-www or vice versa)

---

## Payment Integration

### Stripe Configuration

- [ ] **CRITICAL**: Stripe account in **production mode**
- [ ] Webhook endpoint registered: `https://api.rachelfoods.com/api/payments/webhook`
- [ ] Webhook events enabled:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
- [ ] Webhook secret configured in backend env
- [ ] Test payment in production (small amount)
- [ ] Refund tested in production

---

## Email & Notifications

### Email Service

- [ ] Email service provider configured (SendGrid, AWS SES, Mailgun)
- [ ] SMTP credentials in environment variables
- [ ] Email templates tested:
  - Order confirmation
  - Payment success
  - Order shipped
  - Refund processed
- [ ] Sender domain verified (SPF, DKIM records)

### Admin Notifications

- [ ] Admin alert emails configured
- [ ] Low stock alerts enabled (if applicable)
- [ ] Failed payment alerts enabled

---

## Legal & Compliance

### Privacy & Terms

- [ ] Privacy Policy page created
- [ ] Terms of Service page created
- [ ] Cookie consent banner (if EU traffic expected)
- [ ] GDPR compliance (if applicable)

### Payment Compliance

- [ ] PCI DSS compliance (Stripe handles card data)
- [ ] Sales tax calculation configured (if applicable)
- [ ] Refund policy displayed

---

## Testing in Production

### Smoke Tests

- [ ] Homepage loads
- [ ] Catalog browsing works
- [ ] User registration works
- [ ] User login works
- [ ] Add product to cart
- [ ] Checkout flow (test payment)
- [ ] Order confirmation email received
- [ ] Admin login works
- [ ] Admin dashboard loads metrics
- [ ] Order status update works

### Edge Cases

- [ ] Expired JWT token handled
- [ ] Invalid payment handled
- [ ] Out-of-stock product handled
- [ ] Concurrent order creation handled
- [ ] Double-refund prevented

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

1. Revert DNS to previous version (if domain-based)
2. Revert hosting platform to previous deployment
3. Notify users via status page

### Database Rollback

1. Stop application
2. Restore database from backup
3. Roll back migrations: `npx prisma migrate resolve --rolled-back <migration>`
4. Restart application

### Communication Plan

- [ ] Status page URL defined
- [ ] User notification email template ready
- [ ] Support email monitored

---

## Launch Day Checklist

### 1 Hour Before Launch

- [ ] Final backup of database
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Verify environment variables
- [ ] Run smoke tests

### At Launch

- [ ] Monitor logs for errors
- [ ] Monitor payment webhooks
- [ ] Monitor user registrations
- [ ] Monitor order creation

### 1 Hour After Launch

- [ ] Check error rates in monitoring tool
- [ ] Verify payments processing successfully
- [ ] Check email delivery rates
- [ ] Review user feedback

---

## Post-Launch Monitoring (First 24 Hours)

### Metrics to Watch

- [ ] Error rate (target: < 1%)
- [ ] Response time (target: < 500ms p95)
- [ ] Payment success rate (target: > 95%)
- [ ] Email delivery rate (target: > 98%)
- [ ] User registration rate
- [ ] Order conversion rate

### Alerts to Configure

- [ ] Error rate > 5%
- [ ] Response time > 1000ms
- [ ] Payment webhook failures
- [ ] Database connection failures
- [ ] Disk space < 20%

---

## CRITICAL BLOCKERS (Must Fix Before Launch)

1. **CORS Configuration**: Change from wildcard (`origin: true`) to specific domains
2. **Rate Limiting Validation**: Test rate limiting works behind production proxy
3. **Database Backups**: Configure automated backups
4. **Monitoring Setup**: Add error tracking (Sentry) and APM
5. **Stripe Webhook Registration**: Register production webhook endpoint

---

## RECOMMENDED IMPROVEMENTS (Post-V1)

1. **JWT Refresh Tokens**: Add refresh token mechanism for better UX
2. **Redis Caching**: Replace in-memory cache with Redis for multi-instance support
3. **CDN**: Add CDN for static assets (images, fonts)
4. **Database Indexes**: Add indexes for common queries
5. **Enhanced Rate Limiting**: Add per-endpoint rate limits
6. **Audit Logging**: Add audit trail for admin actions
7. **2FA**: Add two-factor authentication for admin accounts

---

## Sign-Off

- [ ] **Backend Lead**: All backend checks complete
- [ ] **Frontend Lead**: All frontend checks complete
- [ ] **DevOps Lead**: Deployment configured, monitoring active
- [ ] **Security Lead**: Security audit passed
- [ ] **Product Owner**: Acceptance criteria met

**Launch Authorized By**: ************\_\_\_************  
**Date**: ************\_\_\_************
