# PHASE 7: POST-LAUNCH MONITORING CHECKLIST

**Purpose**: Continuous monitoring and incident response for production RachelFoods platform

---

## Real-Time Monitoring (First 48 Hours)

### Application Health

- [ ] **Every 5 minutes**: Check `/api/health` endpoint status
- [ ] **Every 15 minutes**: Review error logs in monitoring tool
- [ ] **Every 30 minutes**: Check response time metrics (p50, p95, p99)
- [ ] **Every hour**: Review database connection pool usage

### Business Metrics

- [ ] **Every hour**: Monitor order creation rate
- [ ] **Every hour**: Monitor payment success rate
- [ ] **Every 2 hours**: Check refund request volume
- [ ] **Daily**: Review revenue vs. projections

### User Experience

- [ ] **Every hour**: Monitor user registration rate
- [ ] **Every hour**: Check cart abandonment rate
- [ ] **Every 2 hours**: Review customer support tickets
- [ ] **Daily**: Analyze most-visited pages

---

## Key Performance Indicators (KPIs)

### Technical KPIs

| Metric                   | Target  | Warning | Critical | Action                               |
| ------------------------ | ------- | ------- | -------- | ------------------------------------ |
| **Error Rate**           | < 0.5%  | > 1%    | > 5%     | Investigate logs, rollback if needed |
| **Response Time (p95)**  | < 500ms | > 800ms | > 2000ms | Scale backend, optimize queries      |
| **Database CPU**         | < 60%   | > 75%   | > 90%    | Add read replicas, optimize indexes  |
| **Payment Success Rate** | > 98%   | < 95%   | < 90%    | Check Stripe dashboard, review logs  |
| **Uptime**               | 99.9%   | < 99.5% | < 99%    | Investigate downtime cause           |

### Business KPIs

| Metric                   | Target | Action if Below Target                       |
| ------------------------ | ------ | -------------------------------------------- |
| **Conversion Rate**      | > 2%   | Review checkout UX, reduce friction          |
| **Average Order Value**  | > $50  | Promote bundles, upsell products             |
| **Cart Abandonment**     | < 70%  | Send cart reminder emails                    |
| **Refund Rate**          | < 3%   | Review product descriptions, quality control |
| **Repeat Customer Rate** | > 20%  | Enhance refill feature, loyalty program      |

---

## Monitoring Tools Configuration

### Error Tracking (Sentry)

```bash
# Frontend .env.production
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy

# Backend environment
SENTRY_DSN=https://xxx@sentry.io/zzz
```

**Alerts**:

- Error rate > 10 errors/min → Slack/Email
- Critical exception (database connection) → Immediate SMS
- Payment failure spike > 10% → Immediate alert

### Application Performance Monitoring (APM)

**Options**: New Relic, Datadog, or AWS CloudWatch

**Key Dashboards**:

1. **Request Overview**: Response time, throughput, error rate
2. **Database Performance**: Query time, slow queries, connection pool
3. **External Services**: Stripe API latency, email delivery time
4. **Background Jobs**: Refill processing, notification sending

**Alerts**:

- p95 response time > 1000ms for 5 minutes
- Database query time > 500ms
- Stripe API errors > 5 in 10 minutes

### Log Aggregation

**Options**: Loggly, Papertrail, CloudWatch Logs

**Log Queries to Set Up**:

```
# Failed payments
status:FAILED AND path:"/api/payments"

# Authentication failures
status:401 AND path:"/api/auth/login"

# Admin actions
role:ADMIN AND method:POST|PUT|DELETE

# Webhook failures
path:"/api/payments/webhook" AND status:400
```

---

## Incident Response Playbook

### Severity Levels

#### **P0: Critical (Immediate Response)**

- **Definition**: Complete service outage, payment system down, data breach
- **Response Time**: < 15 minutes
- **Team**: On-call engineer + engineering manager
- **Actions**:
  1. Acknowledge incident in monitoring tool
  2. Post status update on status page
  3. Investigate root cause
  4. Implement fix or rollback
  5. Post-incident review within 24 hours

#### **P1: High (Urgent)**

- **Definition**: Partial outage, payment delays, database performance degraded
- **Response Time**: < 1 hour
- **Team**: On-call engineer
- **Actions**:
  1. Acknowledge incident
  2. Investigate and diagnose
  3. Implement fix
  4. Monitor for recurrence

#### **P2: Medium (Important)**

- **Definition**: Non-critical feature broken, email delays, slow response times
- **Response Time**: < 4 hours
- **Team**: On-call engineer (during business hours)
- **Actions**:
  1. Create incident ticket
  2. Investigate during next shift
  3. Plan fix for next deployment

#### **P3: Low (Minor)**

- **Definition**: UI glitches, non-critical bugs, cosmetic issues
- **Response Time**: < 24 hours
- **Team**: Development team
- **Actions**:
  1. Log in backlog
  2. Prioritize in next sprint

---

## Common Issues & Resolutions

### Issue: High Error Rate (> 5%)

**Diagnosis Steps**:

1. Check error logs for common patterns
2. Review recent deployments (within last 2 hours)
3. Check database status and connection pool
4. Verify external service status (Stripe, email provider)

**Resolution**:

- If recent deployment: Rollback immediately
- If database issue: Scale up or optimize queries
- If external service: Switch to fallback or wait for recovery
- If unknown: Rollback to last known good version

### Issue: Payment Failures Spike

**Diagnosis Steps**:

1. Check Stripe dashboard for service issues
2. Review payment webhook logs
3. Verify Stripe API keys are correct
4. Check for order validation errors

**Resolution**:

- If Stripe outage: Display maintenance message, allow COD
- If webhook issue: Manually reconcile payments after recovery
- If validation error: Fix validation logic, redeploy

### Issue: Slow Response Times (> 2s p95)

**Diagnosis Steps**:

1. Check APM for slow endpoints
2. Review database slow query log
3. Check database connection pool saturation
4. Verify cache hit rate

**Resolution**:

- Add database indexes for slow queries
- Increase cache TTL for heavy endpoints
- Scale backend horizontally (add instances)
- Optimize expensive queries

### Issue: Email Delivery Failures

**Diagnosis Steps**:

1. Check email service provider dashboard
2. Review SMTP error logs
3. Verify sender domain authentication (SPF, DKIM)
4. Check email rate limits

**Resolution**:

- If provider issue: Switch to backup SMTP
- If rate limited: Implement queue with retry
- If authentication issue: Fix DNS records
- If spam reports: Review email content

---

## Weekly Monitoring Tasks

### Performance Review

- [ ] Analyze slow API endpoints (> 500ms)
- [ ] Review database query performance
- [ ] Identify and fix N+1 query issues
- [ ] Review cache hit rates

### Security Review

- [ ] Review failed login attempts
- [ ] Check for suspicious admin activity
- [ ] Review payment refund patterns
- [ ] Audit role/permission changes

### Business Analysis

- [ ] Generate weekly revenue report
- [ ] Analyze top-selling products
- [ ] Review customer churn rate
- [ ] Identify drop-off points in checkout

### Infrastructure Health

- [ ] Check disk space utilization
- [ ] Review database backup logs
- [ ] Verify SSL certificate expiration dates
- [ ] Test rollback procedure (staging)

---

## Monthly Monitoring Tasks

### Performance Optimization

- [ ] Analyze traffic patterns and scale accordingly
- [ ] Review and optimize database indexes
- [ ] Implement new caching strategies
- [ ] Optimize image sizes and CDN usage

### Security Hardening

- [ ] Update dependencies with security patches
- [ ] Review and rotate API keys
- [ ] Audit user permissions
- [ ] Penetration testing (if applicable)

### Cost Optimization

- [ ] Review hosting costs
- [ ] Optimize database query efficiency
- [ ] Review third-party service usage (Stripe fees, email costs)
- [ ] Archive old data

---

## Monitoring Dashboards

### Executive Dashboard (Non-Technical)

**Metrics**:

- Revenue today / this week / this month
- Orders today / this week / this month
- Active users (last 24h)
- Conversion rate
- Average order value
- Top-selling products

**Access**: `/admin` dashboard (already implemented in Phase 6B)

### Engineering Dashboard (Technical)

**Metrics**:

- Error rate (last hour)
- Response time (p50, p95, p99)
- Database CPU / Memory usage
- Payment success rate
- Cache hit rate
- Background job queue length

**Tool**: APM dashboard (New Relic, Datadog)

### On-Call Dashboard (Alerts)

**Metrics**:

- Active incidents
- Recent deployments
- System health check status
- Critical errors (last 15 min)
- Payment webhook failures

**Tool**: PagerDuty, Opsgenie, or Slack alerts

---

## Alerting Rules

### Critical Alerts (SMS + Email)

```yaml
- name: Service Down
  condition: health_check_failed for 2 minutes
  action: Page on-call engineer

- name: Database Connection Lost
  condition: prisma_connection_error
  action: Page on-call engineer + DBA

- name: Payment System Down
  condition: stripe_webhook_failures > 10 in 5 minutes
  action: Page on-call engineer
```

### High Priority Alerts (Email + Slack)

```yaml
- name: High Error Rate
  condition: error_rate > 5% for 5 minutes
  action: Notify engineering channel

- name: Slow Response Time
  condition: p95_response_time > 2000ms for 10 minutes
  action: Notify engineering channel

- name: Payment Success Rate Low
  condition: payment_success_rate < 90% for 15 minutes
  action: Notify engineering + finance
```

### Medium Priority Alerts (Slack Only)

```yaml
- name: Elevated Error Rate
  condition: error_rate > 1% for 15 minutes
  action: Notify engineering channel

- name: Email Delivery Issues
  condition: email_failure_rate > 10% for 30 minutes
  action: Notify engineering channel
```

---

## Post-Incident Review Template

### Incident Summary

- **Date**: YYYY-MM-DD
- **Duration**: X hours, Y minutes
- **Severity**: P0 / P1 / P2 / P3
- **Impact**: X users affected, $Y revenue lost

### Timeline

- **HH:MM** - Incident detected (by monitoring / user report)
- **HH:MM** - On-call engineer paged
- **HH:MM** - Root cause identified
- **HH:MM** - Fix deployed / Rollback initiated
- **HH:MM** - Service restored
- **HH:MM** - Incident resolved

### Root Cause

Describe technical root cause

### Resolution

Describe fix applied

### Preventive Measures

- [ ] Add monitoring for early detection
- [ ] Improve error handling
- [ ] Add automated tests
- [ ] Document runbook

### Action Items

| Task            | Owner    | Due Date   | Status |
| --------------- | -------- | ---------- | ------ |
| Add alert for X | Engineer | YYYY-MM-DD | Open   |
| Fix Y bug       | Engineer | YYYY-MM-DD | Open   |

---

## On-Call Rotation

### Schedule

- **Primary On-Call**: Week 1, 3, 5...
- **Secondary On-Call**: Week 2, 4, 6...
- **Escalation**: Engineering Manager

### Responsibilities

- Respond to P0/P1 incidents within SLA
- Monitor alerts during on-call shift
- Update incident status page
- Handoff notes at end of shift

### Escalation Path

1. **Primary On-Call** → No response in 15 min
2. **Secondary On-Call** → No response in 15 min
3. **Engineering Manager** → Immediate escalation

---

## Useful Commands

### Check Application Health

```bash
# Backend health
curl https://api.rachelfoods.com/api/health

# Database connection
npx prisma db execute --sql "SELECT 1"

# Check recent errors
# (Use monitoring tool or log aggregation)
```

### Emergency Rollback

```bash
# Render/Railway
render rollback <service-id> --deployment <previous-deployment-id>

# Vercel
vercel rollback

# Database migration rollback
npx prisma migrate resolve --rolled-back <migration-name>
```

### Manual Payment Reconciliation

```bash
# If webhooks fail, manually sync payment status
npm run script:sync-payments
```

---

## Status Page

### Create Public Status Page

**Tools**: Statuspage.io, Atlassian Statuspage, or custom

**Components to Monitor**:

- Website (Frontend)
- API (Backend)
- Payment Processing
- Email Delivery

**Incident Communication Template**:

```
Title: [Service Name] - [Issue Summary]

We are currently experiencing [issue description].
Our team is investigating and working on a resolution.

Affected Services: [List]
Started: [Time]
Status: Investigating / Identified / Monitoring / Resolved

Updates will be posted here as we learn more.
```

---

## Success Criteria (First 30 Days)

- [ ] **Uptime**: > 99.5%
- [ ] **Error Rate**: < 1%
- [ ] **Payment Success Rate**: > 95%
- [ ] **P0 Incidents**: 0
- [ ] **P1 Incidents**: < 2
- [ ] **Customer Complaints**: < 5% of orders
- [ ] **Email Delivery Rate**: > 98%

---

**Monitoring Lead**: ************\_\_\_************  
**Last Updated**: ************\_\_\_************
