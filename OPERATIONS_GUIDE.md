# RachelFoods: Operations Guide

**Author**: Olufemi Aderinto  
**Role**: Full-Stack Software Engineer  
**Last Updated**: January 14, 2026

---

## Overview

This guide documents operational procedures, failure scenarios, and admin workflows for RachelFoods. It assumes the reader is a technical operator (engineer, DevOps, or technical support) with database and backend access.

**Core Principles**:

1. Automate high-frequency, low-risk operations
2. Manual intervention for high-risk, low-frequency operations
3. Every manual intervention must be logged and auditable
4. Incident response prioritizes data integrity over uptime

---

## Failure Scenarios

### Scenario 1: Payment Webhook Delayed

**What Happens**:

- Customer completes payment via Stripe (3D Secure, card verification)
- Stripe sends `payment_intent.succeeded` webhook to backend
- Webhook delivery is delayed (network issues, backend downtime, Stripe retry backoff)
- Order status remains `PENDING` instead of `PAID`

**Customer Impact**:

- Order confirmation email not sent
- Customer sees "Payment processing..." message on order page
- Admin dashboard shows order as `PENDING`

**System Behavior**:

- Frontend polls order status every 5 seconds (max 10 attempts)
- If order status remains `PENDING` after 50 seconds, display: "Payment is being processed. You will receive a confirmation email within 15 minutes."
- Backend continues to accept webhook (Stripe retries for up to 3 days)

**Resolution**:

1. **Automatic**: Stripe retries webhook (exponential backoff: 5s, 30s, 2m, 15m, 1h, 4h, 12h)
2. **Manual (if webhook fails after 24 hours)**:
   - Admin navigates to Stripe dashboard → Events
   - Locate `payment_intent.succeeded` event for PaymentIntent
   - Verify payment was successful (amount charged, no refund)
   - Manually update order in database:

     ```sql
     UPDATE orders
     SET status = 'PAID', payment_status = 'PAID', paid_at = NOW()
     WHERE id = '<order_id>';

     INSERT INTO payments (order_id, stripe_payment_intent_id, amount, status, processed_at)
     VALUES ('<order_id>', 'pi_...', <amount>, 'SUCCEEDED', NOW());
     ```

   - Trigger order confirmation email:
     ```bash
     curl -X POST https://api.rachelfoods.com/admin/orders/<order_id>/send-confirmation \
       -H "Authorization: Bearer <admin-token>"
     ```

**Prevention**:

- Monitor webhook delivery rate (should be > 99%)
- Alert if webhook failure rate exceeds 1% over 10-minute window
- Ensure backend `/api/payments/stripe/webhook` endpoint has 30-second timeout

---

### Scenario 2: Payment Fails After Order Creation

**What Happens**:

- Customer places order (inventory reserved)
- Payment fails (card declined, insufficient funds, network timeout)
- Order remains in `PENDING` state with payment status `FAILED`

**System Behavior**:

- Inventory remains reserved (locked for 30 minutes)
- After 30 minutes, inventory is released automatically (cron job)
- Customer redirected to checkout page with error message: "Payment failed. Please try again with a different payment method."

**Resolution**:

1. **Automatic**: Inventory released after 30 minutes (no manual intervention)
2. **Customer Retry**: Customer can retry payment with same order (new PaymentIntent created)
3. **Manual (if customer contacts support)**:
   - Verify payment failure reason in Stripe dashboard
   - If card issue: Advise customer to use different card
   - If network issue: Suggest customer retry after 5 minutes
   - If order needs cancellation:

     ```sql
     UPDATE orders
     SET status = 'CANCELLED', cancelled_at = NOW()
     WHERE id = '<order_id>';

     -- Inventory released automatically by trigger
     ```

**Monitoring**:

- Track payment failure rate (should be < 5%)
- Alert if failure rate exceeds 10% over 10-minute window (indicates Stripe API issue)

---

### Scenario 3: Stock Runs Out During Checkout

**What Happens**:

- Customer adds last unit of product to cart
- Another customer completes purchase for same product before first customer checks out
- First customer proceeds to checkout
- Inventory validation fails (stock = 0)

**System Behavior**:

- Order creation fails with error: `InsufficientStockError`
- Frontend displays: "This product is out of stock. Please remove it from your cart."
- No payment attempted (inventory check happens before PaymentIntent creation)

**Resolution**:

- **Automatic**: Customer removes out-of-stock item from cart
- **Manual (if customer contacts support)**:
  - Check product stock in database:
    ```sql
    SELECT stock, reserved_stock FROM products WHERE id = '<product_id>';
    ```
  - If stock is available but reserved: Advise customer to wait 30 minutes (reservations expire)
  - If stock is genuinely out of stock: Notify customer and suggest alternative products

**Prevention**:

- Display real-time stock availability on product pages
- Show "Low stock: Only X remaining" when stock < 5
- Send email to vendor when stock falls below 10 units

---

### Scenario 4: Refund Request Submitted

**What Happens**:

- Customer requests refund via order page
- Refund request created with status `PENDING`
- Admin receives notification in admin dashboard

**Admin Workflow**:

1. Navigate to Admin Dashboard → Refunds
2. Review refund request (order details, reason, customer history)
3. Verify order eligibility (not already refunded, not shipped)
4. Approve or reject refund:
   - **Approve**:
     - Wallet credited instantly (customer can use credit immediately)
     - Stripe refund initiated (async, takes 5-10 business days)
     - Order status updated to `REFUNDED`
     - Customer receives refund confirmation email
   - **Reject**:
     - Refund request status updated to `REJECTED`
     - Customer receives email with rejection reason

**Manual Refund (Backend Admin Panel)**:

```typescript
// Admin navigates to order details page
// Clicks "Issue Refund" button
// Enters refund amount (full or partial)
// Confirms refund

// Backend processes refund:
POST /admin/orders/<order_id>/refunds
{
  "amount": 45.99,
  "reason": "Customer dissatisfaction"
}

// Response:
{
  "refundId": "ref_...",
  "status": "COMPLETED",
  "walletCredited": 45.99,
  "stripeRefundId": "re_..."
}
```

**Edge Cases**:

- **Cash on Delivery Orders**: Cannot refund via Stripe (no card charged). Wallet credited only.
- **Partial Refunds**: Wallet credited with partial amount. Stripe refund processes partial amount.
- **Duplicate Refund Requests**: Second request fails with error: "Refund already processed for this order."

---

### Scenario 5: Stripe Webhook Signature Verification Fails

**What Happens**:

- Stripe sends webhook to backend
- Backend attempts signature verification (HMAC-SHA256)
- Verification fails (invalid signature, wrong webhook secret)
- Webhook rejected with 400 Bad Request

**System Behavior**:

- Webhook not processed (order status remains unchanged)
- Error logged to Sentry with details: `WebhookVerificationError: Invalid signature`
- Stripe retries webhook (up to 3 days)

**Resolution**:

1. **Automatic**: If webhook secret is correct, subsequent retry will succeed
2. **Manual (if issue persists)**:
   - Verify webhook secret in Render environment variables matches Stripe dashboard
   - Check webhook endpoint logs for raw signature and payload
   - Test webhook locally:
     ```bash
     stripe listen --forward-to localhost:4000/api/payments/stripe/webhook
     stripe trigger payment_intent.succeeded
     ```
   - If webhook secret is incorrect, update in Render dashboard and redeploy backend

**Prevention**:

- Monitor webhook verification failure rate (should be 0%)
- Alert if verification failure rate exceeds 0.1% over 10-minute window

---

### Scenario 6: Database Connection Pool Exhausted

**What Happens**:

- Backend receives high traffic (1000+ concurrent requests)
- Prisma connection pool exhausted (all 10 connections in use)
- New requests fail with error: `Connection pool timeout`
- Frontend displays 500 Internal Server Error

**System Behavior**:

- Requests queue up (waiting for available connection)
- If connection not available within 10 seconds, request fails
- Error logged to Sentry

**Resolution**:

1. **Immediate**: Scale backend horizontally (add more instances)
   - Render dashboard → Manual Deploy → Scale to 5 instances
2. **Short-term**: Increase connection pool size
   - Update `DATABASE_URL` in Render:
     ```
     postgresql://user:pass@host:5432/db?connection_limit=20
     ```
   - Redeploy backend
3. **Long-term**: Implement connection pooler (PgBouncer)
   - Deploy PgBouncer container on Render
   - Configure backend to connect via PgBouncer
   - PgBouncer manages connection pooling across all backend instances

**Monitoring**:

- Track active database connections (Render dashboard)
- Alert if connection count exceeds 80% of pool size

---

## Admin Operational Workflows

### Creating Admin User

**Process**:

1. Run seed script (development only):

   ```bash
   npx prisma db seed
   ```

   - Creates admin user: `admin@rachelfoods.com` / `Admin123!`

2. Manually create admin user (production):

   ```sql
   INSERT INTO users (id, email, password, role, created_at)
   VALUES (
     gen_random_uuid(),
     'admin@rachelfoods.com',
     -- Password hash generated with bcrypt (salt rounds = 10)
     '$2b$10$...',
     'ADMIN',
     NOW()
   );
   ```

3. Generate password hash:

   ```typescript
   import * as bcrypt from "bcrypt";

   const password = "Admin123!";
   const hash = await bcrypt.hash(password, 10);
   console.log(hash);
   ```

---

### Bulk Product Import

**Process**:

1. Prepare CSV file (products.csv):

   ```csv
   name,description,price,stock,category,image_url
   "Product A","Description A",19.99,100,VEGETABLES,https://...
   "Product B","Description B",29.99,50,GRAINS,https://...
   ```

2. Upload CSV via admin dashboard (Admin → Products → Import)

3. Manually import via backend endpoint:

   ```bash
   curl -X POST https://api.rachelfoods.com/admin/products/import \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@products.csv"
   ```

4. Backend validates CSV (schema, data types, duplicate SKUs)
5. Products inserted into database (transaction ensures atomicity)
6. Import summary returned:
   ```json
   {
     "imported": 150,
     "failed": 5,
     "errors": [
       { "row": 3, "reason": "Invalid price format" },
       { "row": 7, "reason": "Duplicate SKU" }
     ]
   }
   ```

---

### Manually Adjusting Inventory

**When**: Stock count discrepancy (physical inventory count vs database)

**Process**:

1. Admin navigates to product details page
2. Clicks "Adjust Inventory" button
3. Enters new stock count and reason
4. Backend creates inventory adjustment record:

   ```sql
   INSERT INTO inventory_adjustments (product_id, old_stock, new_stock, reason, adjusted_by, adjusted_at)
   VALUES ('<product_id>', 50, 45, 'Physical count correction', '<admin_id>', NOW());

   UPDATE products
   SET stock = 45
   WHERE id = '<product_id>';
   ```

**Audit Trail**:

- All inventory adjustments logged with admin user ID
- Adjustments viewable in Admin Dashboard → Inventory → Adjustments

---

### Manually Crediting Wallet

**When**: Customer compensation (service issue, damaged product, goodwill gesture)

**Process**:

1. Admin navigates to user profile page
2. Clicks "Credit Wallet" button
3. Enters amount and reason
4. Backend credits wallet (transactional):
   ```typescript
   await this.prisma.$transaction(async (tx) => {
     await tx.wallets.update({
       where: { userId: "<user_id>" },
       data: { balance: { increment: 10.0 } },
     });

     await tx.wallet_transactions.create({
       data: {
         walletId: "<wallet_id>",
         type: "CREDIT",
         amount: 10.0,
         reason: "Compensation for delayed shipment",
         adminId: "<admin_id>",
       },
     });
   });
   ```

**Audit Trail**:

- All wallet credits logged with admin user ID
- Credits viewable in Admin Dashboard → Wallets → Transactions

---

## What is Intentionally NOT Automated

### 1. Refund Approval

**Why Manual**: Requires human judgment (customer history, refund reason, fraud detection)  
**Automation Risk**: Customers could abuse automated refunds (order → refund → repeat)  
**Future Consideration**: Auto-approve refunds for trusted customers (order history > 10, no previous refunds)

### 2. Coupon Creation

**Why Manual**: Business decision (discount strategy, campaign targeting, budget constraints)  
**Automation Risk**: Incorrect coupon configuration could result in financial loss (100% discount, no minimum order)  
**Future Consideration**: Template-based coupon creation (seasonal campaigns)

### 3. Vendor Onboarding

**Why Manual**: Requires KYC verification, contract signing, payment terms negotiation  
**Automation Risk**: Fraudulent vendors, legal liabilities  
**Future Consideration**: Self-service vendor registration with manual approval step

### 4. Database Migrations

**Why Manual**: Schema changes require testing on staging before production deployment  
**Automation Risk**: Irreversible data loss (DROP COLUMN, incorrect data type conversion)  
**Future Consideration**: Automated migrations for staging (manual approval for production)

### 5. Price Adjustments

**Why Manual**: Pricing is strategic business decision  
**Automation Risk**: Incorrect pricing could result in financial loss or customer confusion  
**Future Consideration**: Scheduled price changes (Black Friday sales, seasonal pricing)

---

## Monitoring Expectations

### Error Rate

**Normal**: < 1% of requests result in 500 errors  
**Warning**: 1-5% error rate (investigate immediately)  
**Critical**: > 5% error rate (rollback deployment, page on-call engineer)

**Common Errors**:

- `DatabaseConnectionError`: Connection pool exhausted (scale horizontally)
- `StripeAPIError`: Stripe API down (wait for Stripe status page update)
- `ValidationError`: Invalid input (client-side validation bug)

### Payment Success Rate

**Normal**: > 95% of PaymentIntents succeed  
**Warning**: 90-95% success rate (Stripe API degraded, card issuer issues)  
**Critical**: < 90% success rate (Stripe API down, webhook endpoint unreachable)

### Response Time

**Normal**: P95 response time < 500ms  
**Warning**: P95 response time 500-1000ms (database slow queries, high traffic)  
**Critical**: P95 response time > 1000ms (scale backend, optimize queries)

### Database Performance

**Normal**: Query execution time < 100ms  
**Warning**: Query execution time 100-500ms (missing indexes, N+1 queries)  
**Critical**: Query execution time > 500ms (database overload, connection pool exhausted)

---

## Safe Manual Interventions

### Updating Order Status

**Safe**:

```sql
-- Mark order as shipped
UPDATE orders
SET status = 'SHIPPED', shipped_at = NOW()
WHERE id = '<order_id>' AND status = 'CONFIRMED';
```

**Unsafe**:

```sql
-- Skipping payment validation
UPDATE orders
SET status = 'PAID', payment_status = 'PAID'
WHERE id = '<order_id>';
-- Risk: Order marked as paid without actual payment
```

### Cancelling Order

**Safe**:

```sql
-- Cancel order before payment
UPDATE orders
SET status = 'CANCELLED', cancelled_at = NOW()
WHERE id = '<order_id>' AND payment_status = 'PENDING';
-- Inventory automatically released by database trigger
```

**Unsafe**:

```sql
-- Cancelling paid order without refund
UPDATE orders
SET status = 'CANCELLED'
WHERE id = '<order_id>' AND payment_status = 'PAID';
-- Risk: Customer charged without refund
```

### Crediting Wallet

**Safe**:

```typescript
// Use admin endpoint (transactional, auditable)
POST /admin/wallets/<wallet_id>/credit
{
  "amount": 10.00,
  "reason": "Compensation for service issue"
}
```

**Unsafe**:

```sql
-- Direct database update (no audit trail)
UPDATE wallets
SET balance = balance + 10.00
WHERE id = '<wallet_id>';
-- Risk: No transaction record, no admin attribution
```

---

## Incident Response Philosophy

### Principles

1. **Data Integrity > Uptime**: If data corruption risk exists, take system offline
2. **Automated Rollback**: If error rate exceeds threshold, rollback automatically
3. **Communicate Proactively**: Notify customers via status page (status.rachelfoods.com)
4. **Post-Mortem Always**: Every P0/P1 incident requires documented post-mortem

### P0 Incident (Critical)

**Definition**: Payments failing, site down, data corruption  
**Response Time**: < 5 minutes  
**Escalation**: Page on-call engineer immediately  
**Resolution**: Rollback deployment or scale infrastructure

### P1 Incident (High)

**Definition**: Admin dashboard inaccessible, webhook failures  
**Response Time**: < 15 minutes  
**Escalation**: Notify engineering team via Slack  
**Resolution**: Deploy hotfix within 1 hour

### P2 Incident (Medium)

**Definition**: Non-critical API errors, slow response times  
**Response Time**: < 1 hour  
**Escalation**: Create ticket in issue tracker  
**Resolution**: Fix in next deployment cycle

---

## Runbook: Common Operations

### Restarting Backend Service

```bash
# Via Render dashboard:
1. Navigate to rachelfoods-backend service
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Monitor health check (30-second interval)

# Via Render CLI:
render services restart rachelfoods-backend
```

### Clearing Cache

```bash
# Backend in-memory cache (featured/popular products)
curl -X POST https://api.rachelfoods.com/admin/cache/clear \
  -H "Authorization: Bearer <admin-token>"

# Response:
{"message": "Cache cleared", "keys": ["featured-products", "popular-products"]}
```

### Generating Backup

```bash
# Database backup (Render automated daily backups)
# Manual backup:
render backups create rachelfoods-db --description "Pre-deployment backup"

# Download backup:
render backups download rachelfoods-db <backup-id> --output backup.sql
```

### Restoring from Backup

```bash
# WARNING: This will overwrite production database
render backups restore rachelfoods-db <backup-id>

# Verify restoration:
psql -h <host> -U <user> -d <database> -c "SELECT COUNT(*) FROM orders;"
```

---

**Author**: Olufemi Aderinto  
**GitHub**: [rachelfuud/rachelfoods](https://github.com/rachelfuud/rachelfoods)  
**Last Updated**: January 14, 2026
