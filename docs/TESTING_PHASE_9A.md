# Phase 9A: Testing & Quality Gates

## Overview

This phase implements comprehensive automated testing for critical business flows and CI/CD quality gates to ensure system safety, prevent silent regressions, and increase release confidence.

## Test Coverage

### 1. Order Creation Tests (`test/order-creation.spec.ts`)

**Critical Invariants:**

- Order creation succeeds for both Stripe and COD payment methods
- Stripe orders must have valid payment intent
- COD orders skip payment intent validation
- Order totals correctly calculated (subtotal + shipping + tax)
- Order status transitions are valid (PENDING → CONFIRMED → etc.)

**Test Cases:**

- ✅ Stripe order with valid payment intent
- ✅ Stripe order rejection with invalid payment intent
- ✅ COD order without payment intent
- ✅ Order total calculation integrity
- ✅ Status transition validation

### 2. Inventory Safety Tests (`test/inventory-safety.spec.ts`)

**Critical Invariants:**

- Stock never goes negative
- Out-of-stock products cannot be ordered
- Concurrent orders respect stock limits (pessimistic locking)
- Stock deduction is atomic (transaction-safe)
- Order cancellation restores stock correctly

**Test Cases:**

- ✅ Stock deduction on order creation
- ✅ Insufficient stock rejection
- ✅ Out-of-stock prevention
- ✅ Exact stock match handling
- ✅ Stock restoration on cancellation
- ✅ Atomic transaction rollback
- ✅ Race condition safety
- ✅ Multi-item stock validation

### 3. Wallet Operations Tests (`test/wallet-operations.spec.ts`)

**Critical Invariants:**

- Balance never goes negative
- Insufficient funds prevents debit
- Refund credits are atomic
- Transaction history is immutable
- Balance equals sum of all transactions

**Test Cases:**

- ✅ Debit with sufficient funds
- ✅ Debit rejection for insufficient funds
- ✅ Credit (refund) operations
- ✅ Wallet creation on first credit
- ✅ Exact balance debit
- ✅ Atomic refund operations
- ✅ Transaction immutability
- ✅ Balance integrity formula
- ✅ Concurrent operation safety

### 4. Coupon Validation Tests (`test/coupon-validation.spec.ts`)

**Critical Invariants:**

- Expired coupons cannot be applied
- Usage limits are enforced
- Minimum order amount respected
- Single-use coupons can only be used once per user
- Discount calculation never exceeds order total

**Test Cases:**

- ✅ Expiry date validation
- ✅ Usage limit enforcement
- ✅ Minimum order amount checks
- ✅ Single-use per user restriction
- ✅ Percentage discount calculation
- ✅ Fixed discount calculation
- ✅ Discount cap at order total
- ✅ Inactive coupon rejection
- ✅ Usage recording

### 5. Product Lifecycle Tests (`test/product-lifecycle.spec.ts`)

**Critical Invariants:**

- DRAFT products are never visible to buyers
- Publishing requires: image, price > 0, category
- ACTIVE products can be disabled/archived with confirmation
- Archived products with active orders cannot be deleted
- Status transitions are validated

**Test Cases:**

- ✅ DRAFT → ACTIVE publishing with validation
- ✅ Image requirement enforcement
- ✅ Price validation (> 0)
- ✅ Category requirement
- ✅ Soft warnings (low stock, placeholder images)
- ✅ DRAFT product filtering in public queries
- ✅ Disable with confirmation
- ✅ Archive blocking with active orders
- ✅ Impact preview
- ✅ Status transition validation

## CI/CD Quality Gates

### GitHub Actions Workflow (`.github/workflows/quality-gates.yml`)

**Backend Quality Gates:**

1. ✅ Prisma schema validation
2. ✅ TypeScript build must succeed
3. ✅ Linting enforced (ESLint)
4. ✅ Unit tests must pass
5. ✅ Test coverage reporting

**Frontend Quality Gates:**

1. ✅ TypeScript type checking
2. ✅ Linting enforced (ESLint)
3. ✅ Next.js build must succeed

**Security Gates:**

1. ✅ npm audit for high-severity vulnerabilities

**Trigger Conditions:**

- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

## Running Tests Locally

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- order-creation.spec.ts
```

### Prisma Validation

```bash
cd backend

# Validate schema
npx prisma validate

# Generate client
npx prisma generate
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

### Build Verification

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Test Philosophy

### Focus on Invariants, Not Implementation

These tests focus on **business invariants** - fundamental truths that must always hold:

- Stock cannot be negative
- Balance cannot be negative
- Expired coupons cannot be used
- DRAFT products are invisible to buyers
- Order totals match item sums

### No UI Snapshots

UI snapshot tests are brittle and provide false confidence. Instead, we test:

- API contracts
- Business logic
- Data integrity
- Security boundaries

### Mock External Dependencies

Tests mock:

- Database (PrismaService)
- Payment provider (PaymentService)
- Cache layer (CacheService)

This ensures tests are:

- Fast (no I/O)
- Reliable (no external dependencies)
- Isolated (test one thing)

## Continuous Improvement

### Adding New Tests

When adding new features:

1. **Identify invariants** - What must always be true?
2. **Write tests first** - TDD when possible
3. **Test edge cases** - Zero, negative, null, concurrent
4. **Verify failure paths** - Errors should be handled gracefully

### Test Coverage Goals

- **Critical paths**: 100% coverage
- **Business logic**: 90%+ coverage
- **Utilities**: 80%+ coverage
- **Overall**: 80%+ coverage

## Preventing Regressions

These tests catch regressions in:

1. **Order processing** - Payment validation, inventory deduction
2. **Wallet operations** - Balance management, refunds
3. **Coupon system** - Validation, usage tracking
4. **Product visibility** - Lifecycle enforcement, public/admin queries

## Release Confidence

With these quality gates:

✅ Every commit is validated
✅ Breaking changes are caught early
✅ Business rules are enforced
✅ System integrity is proven
✅ Deployment confidence increases

## Debugging Test Failures

### Failed Test in CI

1. Check GitHub Actions logs
2. Reproduce locally: `npm test -- <test-file>`
3. Fix the issue or update the test if requirements changed
4. Commit and push

### Test Timeout

If tests hang:

- Check for missing `mockResolvedValue` on Prisma mocks
- Verify `beforeEach` clears mocks properly
- Ensure no real I/O operations

### Flaky Tests

If tests pass/fail randomly:

- Check for shared state between tests
- Verify mocks are reset in `beforeEach`
- Look for timing dependencies (use fake timers if needed)

## Maintenance

### Updating Tests

When business logic changes:

1. Update the test to reflect new invariants
2. Update test documentation
3. Verify coverage is maintained
4. Update this README if testing approach changes

### Removing Tests

Only remove tests if:

- Feature was completely removed
- Test is redundant (covered by another test)
- Test is testing implementation, not behavior

## Integration with Development Workflow

### Pre-commit Hooks (Optional)

Consider adding Husky for pre-commit hooks:

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "cd backend && npm test"
```

### Branch Protection Rules

Configure GitHub branch protection:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Require status checks to pass:
   - Backend Quality Gates
   - Frontend Quality Gates
4. Require pull request reviews

This ensures no broken code reaches production.

## Future Enhancements

Potential additions for Phase 9B:

- [ ] Integration tests with test database
- [ ] E2E tests with Playwright
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Mutation testing
- [ ] Contract testing for API
- [ ] Visual regression testing (if needed)

---

**Goal Achieved**: System safety is proven, regressions are prevented, and release confidence is high.
