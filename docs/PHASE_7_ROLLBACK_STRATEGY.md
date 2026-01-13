# PHASE 7: ROLLBACK STRATEGY

**Purpose**: Emergency rollback procedures for RachelFoods production system

---

## Rollback Decision Matrix

### When to Rollback

| Scenario                                 | Severity | Action          | Rollback Decision                    |
| ---------------------------------------- | -------- | --------------- | ------------------------------------ |
| **Complete service outage**              | P0       | Immediate       | ✅ Rollback immediately              |
| **Payment system down**                  | P0       | Immediate       | ✅ Rollback immediately              |
| **Error rate > 10%**                     | P0       | Within 15 min   | ✅ Rollback if not fixable in 15 min |
| **Data corruption detected**             | P0       | Immediate       | ✅ Rollback + restore database       |
| **Security breach**                      | P0       | Immediate       | ✅ Rollback + incident response      |
| **Partial feature broken (non-payment)** | P1       | Within 1 hour   | ⚠️ Fix forward if possible           |
| **Slow response times (> 5s)**           | P1       | Within 1 hour   | ⚠️ Scale first, rollback if persists |
| **Email delivery failing**               | P1       | Within 2 hours  | ⚠️ Fix email service config          |
| **UI glitch (cosmetic)**                 | P2       | Next deployment | ❌ No rollback needed                |

---

## Rollback Types

### 1. Frontend Rollback (Vercel/Netlify)

**Estimated Time**: 2-5 minutes

**Steps**:

```bash
# Via Vercel CLI
vercel rollback

# Via Vercel Dashboard
1. Go to project deployments
2. Find previous successful deployment
3. Click "Promote to Production"
```

**Verification**:

```bash
# Check deployed version
curl https://rachelfoods.com | grep "version"

# Smoke test
- Homepage loads
- Catalog page loads
- Checkout page loads
```

**Rollback Trigger**:

- Frontend build failures
- Critical UI bug blocking checkout
- JavaScript errors preventing page load

---

### 2. Backend Rollback (Render/Railway/Heroku)

**Estimated Time**: 3-10 minutes

**Steps**:

```bash
# Render (via dashboard)
1. Go to service deployments
2. Find previous successful deployment
3. Click "Redeploy"

# Railway (via CLI)
railway up --environment production --detach

# Heroku (via CLI)
heroku rollback v<version-number> --app rachelfoods-backend
```

**Verification**:

```bash
# Health check
curl https://api.rachelfoods.com/api/health

# Test critical endpoints
curl -X POST https://api.rachelfoods.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

curl https://api.rachelfoods.com/api/catalog/products?page=1&limit=10
```

**Rollback Trigger**:

- API errors > 5%
- Database connection failures
- Payment processing failures
- Critical security vulnerability

---

### 3. Database Rollback (Prisma Migrations)

**Estimated Time**: 10-30 minutes (depends on data size)

⚠️ **CRITICAL**: Database rollbacks are risky. Prefer forward fixes when possible.

#### Option A: Rollback Migration (No Data Loss)

**Use When**: Recent migration broke schema but no data written yet

**Steps**:

```bash
# 1. Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration-name>

# 2. Revert migration in code
git revert <migration-commit>

# 3. Create new migration to undo changes
npx prisma migrate dev --name revert_<feature>

# 4. Deploy fixed version
npx prisma migrate deploy
```

**Example**:

```bash
# If migration "20260113_add_loyalty_tiers" broke schema
npx prisma migrate resolve --rolled-back 20260113_add_loyalty_tiers

# Then create reversal migration
npx prisma migrate dev --name revert_loyalty_tiers
```

#### Option B: Database Restore (Data Loss)

**Use When**: Data corruption, critical schema error, no forward fix

⚠️ **WARNING**: This will lose all data since last backup!

**Steps**:

```bash
# 1. Stop application (prevent new writes)
render service:stop rachelfoods-backend

# 2. Restore database from backup
# (Render Postgres)
render postgres:restore rachelfoods-db --backup-id <backup-id>

# (Manual PostgreSQL)
pg_restore -h <host> -U <user> -d rachelfoods <backup-file>

# 3. Verify data integrity
psql -h <host> -U <user> -d rachelfoods -c "SELECT COUNT(*) FROM orders;"

# 4. Restart application
render service:start rachelfoods-backend
```

**Verification**:

- Orders count matches expected
- Users can login
- Recent orders visible (within backup window)
- No orphaned records

**Rollback Trigger**:

- Schema migration failure causing data corruption
- Accidental data deletion via migration
- Database in inconsistent state

---

### 4. Configuration Rollback (Environment Variables)

**Estimated Time**: 1-2 minutes

**Steps**:

```bash
# 1. Identify changed environment variables
# (Check deployment logs for env var changes)

# 2. Revert via hosting platform dashboard
# Render: Settings → Environment → Edit → Revert
# Vercel: Settings → Environment Variables → Edit → Revert

# 3. Redeploy with old configuration
render service:restart rachelfoods-backend
```

**Rollback Trigger**:

- Incorrect API keys (Stripe, email)
- Wrong database connection string
- Incorrect JWT secret (will invalidate all sessions)

---

## Rollback Procedures by Scenario

### Scenario 1: Deployment Breaks Checkout

**Symptoms**:

- Users cannot complete checkout
- Payment errors in logs
- Error rate > 10% on `/api/orders`

**Actions**:

1. **Immediate**: Rollback frontend (5 min)
2. **If persists**: Rollback backend (10 min)
3. **Verify**: Test checkout flow with test payment
4. **Communication**: Post status update ("Checkout temporarily unavailable")

**Decision Time**: 5 minutes - if not fixed, rollback

---

### Scenario 2: Database Migration Failure

**Symptoms**:

- Application crashes on startup
- Database connection errors
- Prisma schema validation errors

**Actions**:

1. **Immediate**: Mark migration as rolled back
2. **Stop application** (prevent further errors)
3. **Option A**: If no data written, rollback migration
4. **Option B**: If data corrupted, restore from backup
5. **Restart application** with old schema
6. **Verify**: Health check passes, orders queryable

**Decision Time**: 10 minutes - assess data loss risk

---

### Scenario 3: Payment System Down

**Symptoms**:

- Stripe webhook failures
- Payment intent creation errors
- Users cannot pay for orders

**Actions**:

1. **Check Stripe Status**: https://status.stripe.com
2. **If Stripe OK**: Rollback backend (10 min)
3. **If Stripe DOWN**: Enable COD fallback, display notice
4. **Verify**: Test payment with Stripe test card
5. **Communication**: "Payment system temporarily unavailable"

**Decision Time**: 15 minutes - verify if Stripe or us

---

### Scenario 4: Performance Degradation

**Symptoms**:

- Response time > 5s (p95)
- Database CPU > 90%
- Slow queries in logs

**Actions**:

1. **Immediate**: Scale backend horizontally (add instances)
2. **Investigate**: Check slow query logs
3. **If recent deployment**: Consider rollback
4. **If database issue**: Optimize queries or scale database
5. **Monitor**: Response times return to < 1s

**Decision Time**: 30 minutes - try scaling first, rollback if no improvement

---

### Scenario 5: Security Vulnerability Discovered

**Symptoms**:

- Security researcher report
- Automated security scan alert
- Suspicious activity in logs

**Actions**:

1. **Immediate**: Assess severity (CVSS score)
2. **If Critical (CVSS > 9.0)**: Rollback immediately
3. **If High (CVSS 7-9)**: Hotfix and deploy within 1 hour
4. **If Medium (CVSS 4-6)**: Schedule fix for next deployment
5. **Communication**: Security advisory if user data affected

**Decision Time**: Immediate for critical vulnerabilities

---

## Rollback Communication

### Internal Communication (Engineering Team)

**Slack Alert Template**:

```
🚨 ROLLBACK IN PROGRESS 🚨

Reason: [Brief description]
Severity: P0 / P1 / P2
Affected Services: [Frontend/Backend/Database]
Started: [Time]
ETA: [Estimated completion time]

Action Items:
- [ ] Frontend rollback
- [ ] Backend rollback
- [ ] Verify services
- [ ] Post-incident review

Lead: @engineer-name
```

### External Communication (Users)

**Status Page Update Template**:

```
Status: Investigating

We are currently experiencing [issue description].
Our team is working on a resolution.

Affected: [Checkout / Payment / Website]
Started: [Time]

Updates will be posted here as we learn more.
```

**Follow-Up After Rollback**:

```
Status: Resolved

The issue has been resolved. All services are now operational.

Resolution: We rolled back a recent deployment that caused [issue].
Duration: [X] minutes

We apologize for any inconvenience. If you experienced issues,
please contact support@rachelfoods.com.
```

---

## Post-Rollback Checklist

### Immediate (Within 1 Hour)

- [ ] All services health checks passing
- [ ] Smoke tests completed successfully
- [ ] Error rate back to normal (< 1%)
- [ ] Payment processing working
- [ ] Users can place orders
- [ ] Status page updated to "Resolved"

### Short-Term (Within 4 Hours)

- [ ] Root cause identified
- [ ] Fix developed and tested in staging
- [ ] Post-incident review scheduled
- [ ] Communication sent to affected users (if applicable)

### Long-Term (Within 24 Hours)

- [ ] Post-incident review completed
- [ ] Action items created (add monitoring, fix bug, improve tests)
- [ ] Fix deployed with extra monitoring
- [ ] Incident report published internally

---

## Testing Rollback Procedures

### Staging Environment Rollback Drill

**Schedule**: Monthly

**Steps**:

1. Deploy intentionally broken code to staging
2. Detect issue via monitoring
3. Execute rollback procedure
4. Verify rollback successful
5. Document time taken and issues encountered

**Success Criteria**:

- Rollback completed within SLA (10 min for backend, 5 min for frontend)
- No manual intervention required
- Monitoring detected issue before user report

---

## Rollback Prevention

### Pre-Deployment Checks

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review approved by 2+ engineers
- [ ] Staging deployment successful
- [ ] Performance benchmarks met
- [ ] Database migrations tested on staging with production-sized data
- [ ] Feature flags enabled for gradual rollout

### Gradual Rollout Strategy

1. **Deploy to staging** → Verify
2. **Deploy to production (10% traffic)** → Monitor for 30 min
3. **Increase to 50% traffic** → Monitor for 1 hour
4. **Full rollout (100%)** → Monitor for 24 hours

### Automatic Rollback Triggers

```yaml
# Configure in CI/CD pipeline
- name: Auto-rollback on high error rate
  trigger: error_rate > 10% for 5 minutes
  action: rollback_deployment

- name: Auto-rollback on payment failures
  trigger: payment_success_rate < 80% for 10 minutes
  action: rollback_deployment
```

---

## Emergency Contacts

### Escalation Path

1. **Primary On-Call**: [Phone] [Slack]
2. **Secondary On-Call**: [Phone] [Slack]
3. **Engineering Manager**: [Phone] [Email]
4. **CTO**: [Phone] [Email]

### Vendor Contacts

- **Stripe Support**: https://support.stripe.com
- **Render Support**: support@render.com
- **Vercel Support**: support@vercel.com
- **Database Provider**: [Contact info]

---

## Rollback Approval Authority

| Severity              | Approval Required   | Can Rollback                      |
| --------------------- | ------------------- | --------------------------------- |
| **P0 (Outage)**       | None                | Any on-call engineer              |
| **P1 (Critical)**     | Engineering Lead    | On-call engineer after assessment |
| **P2 (Non-Critical)** | Engineering Manager | Planned rollback only             |

---

**Rollback Lead**: ************\_\_\_************  
**Last Drill Date**: ************\_\_\_************  
**Next Drill Date**: ************\_\_\_************
