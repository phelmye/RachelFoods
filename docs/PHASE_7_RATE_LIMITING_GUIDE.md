# PHASE 7: CRITICAL BLOCKER #1 - Rate Limiting Implementation Guide

**Priority**: 🚨 **CRITICAL**  
**Estimated Time**: 30 minutes  
**Must Complete Before**: Production launch

---

## Problem Statement

Currently, the RachelFoods backend only has **global rate limiting** (100 requests per 60 seconds per IP). This leaves critical endpoints vulnerable to:

- **Brute-force attacks** on login
- **Payment intent spam** (creating excessive Stripe charges)
- **Refund abuse** (attempting multiple refunds)
- **Admin endpoint abuse** (mass data exfiltration)

---

## Solution: Per-Endpoint Rate Limiting

Add `@Throttle()` decorators to sensitive endpoints with appropriate limits.

---

## Implementation Steps

### Step 1: Verify Throttler Module (Already Configured ✅)

Check `backend/src/app.module.ts`:

```typescript
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 60 seconds
        limit: 100,  // 100 requests
      },
    ]),
    // ... other modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,  // ✅ Already applied globally
    },
  ],
})
```

**Status**: ✅ Already configured. No changes needed.

---

### Step 2: Add Rate Limiting to Auth Endpoints

**File**: `backend/src/auth/auth.controller.ts`

**Changes Required**:

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler"; // ← ADD THIS
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthResponse } from "./interfaces/auth.interface";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new buyer account
   * POST /api/auth/register
   *
   * Rate limit: 3 registrations per 15 minutes per IP
   * Prevents spam account creation
   */
  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // ← ADD THIS (3 per 15 min)
  @ApiOperation({ summary: "Register a new buyer account" })
  @ApiResponse({ status: 201, description: "User successfully registered" })
  @ApiResponse({ status: 400, description: "Invalid registration data" })
  @ApiResponse({ status: 429, description: "Too many registration attempts" }) // ← ADD THIS
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * Login with email and password
   * POST /api/auth/login
   *
   * Rate limit: 5 login attempts per 15 minutes per IP
   * Prevents brute-force password attacks
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // ← ADD THIS (5 per 15 min)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 429, description: "Too many login attempts. Try again later." }) // ← ADD THIS
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }
}
```

**Rationale**:

- **Login**: 5 attempts per 15 min = reasonable for users who forgot password
- **Register**: 3 attempts per 15 min = prevents spam bot account creation

---

### Step 3: Add Rate Limiting to Payment Endpoints

**File**: `backend/src/payments/stripe-payment.controller.ts`

**Changes Required**:

```typescript
import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  Get,
  Param,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler"; // ← ADD THIS
import { StripePaymentService } from "./stripe-payment.service";
import { CreatePaymentIntentDto, PaymentResponseDto } from "./dto/payment.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Request } from "express";

@Controller("payments")
export class StripePaymentController {
  constructor(private readonly stripePaymentService: StripePaymentService) {}

  /**
   * POST /api/payments/create-intent
   * Create a Stripe PaymentIntent for an order
   *
   * Rate limit: 10 payment intents per minute per IP
   * Prevents payment intent spam and Stripe fee abuse
   */
  @Post("create-intent")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // ← ADD THIS (10 per min)
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Req() req: Request
  ): Promise<PaymentResponseDto> {
    const userId = (req.user as any).sub;
    return this.stripePaymentService.createPaymentIntent(dto.orderId, userId);
  }

  /**
   * POST /api/payments/webhook
   * Handle Stripe webhook events
   * NOTE: This endpoint must be configured to receive raw body in main.ts
   *
   * Rate limit: 100 webhooks per minute (Stripe may send bursts)
   */
  @Post("webhook")
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // ← ADD THIS (100 per min for webhooks)
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error("Raw body is required for webhook verification");
    }
    return this.stripePaymentService.handleWebhook(signature, rawBody);
  }

  /**
   * GET /api/payments/order/:orderId
   * Get payment transactions for an order
   *
   * Rate limit: 30 requests per minute (read-heavy endpoint)
   */
  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // ← ADD THIS (30 per min)
  async getOrderPayments(@Param("orderId") orderId: string, @Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.stripePaymentService.getOrderPayments(orderId, userId);
  }

  /**
   * POST /api/payments/cod-confirm
   * Confirm COD order (mark as awaiting confirmation)
   *
   * Rate limit: 10 confirmations per minute
   */
  @Post("cod-confirm")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // ← ADD THIS (10 per min)
  async confirmCODOrder(@Body() dto: CreatePaymentIntentDto, @Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.stripePaymentService.markOrderAsAwaitingConfirmation(dto.orderId, userId);
  }
}
```

**Rationale**:

- **Payment Intent**: 10 per min = prevents Stripe fee abuse
- **Webhook**: 100 per min = Stripe can send burst webhooks (don't block legitimate traffic)
- **Get Payments**: 30 per min = read endpoint, more lenient

---

### Step 4: Add Rate Limiting to Refund Endpoints

**File**: `backend/src/refunds/refund.controller.ts`

**Changes Required**:

```typescript
import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler"; // ← ADD THIS
import { RefundService } from "./refund.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { Request } from "express";

@Controller("refunds")
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * POST /api/refunds/order/:orderId
   * Process a refund for an order
   *
   * Rate limit: 5 refunds per minute per IP
   * Prevents refund abuse and accidental duplicate refunds
   */
  @Post("order/:orderId")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("refund.process")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // ← ADD THIS (5 per min)
  async processRefund(
    @Param("orderId") orderId: string,
    @Body() body: { amount?: number; reason?: string },
    @Req() req: Request
  ) {
    const userId = (req.user as any).sub;
    return this.refundService.processRefund(orderId, userId, body.amount, body.reason);
  }

  /**
   * GET /api/refunds
   * Get all refunds (admin only)
   *
   * Rate limit: 20 requests per minute (admin read)
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions("refund.view")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // ← ADD THIS (20 per min)
  async getAllRefunds(@Req() req: Request) {
    return this.refundService.getAllRefunds();
  }

  /**
   * GET /api/refunds/:id
   * Get refund by ID
   *
   * Rate limit: 30 requests per minute (read endpoint)
   */
  @Get(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("refund.view")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // ← ADD THIS (30 per min)
  async getRefund(@Param("id") id: string) {
    return this.refundService.getRefundById(id);
  }
}
```

**Rationale**:

- **Process Refund**: 5 per min = prevents accidental double-refunds
- **Get Refunds**: 20-30 per min = read-heavy, more lenient

---

### Step 5: Add Rate Limiting to Wallet Endpoints

**File**: `backend/src/wallet/wallet.controller.ts`

**Changes Required**:

```typescript
import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler"; // ← ADD THIS
import { WalletService } from "./wallet.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { Request } from "express";

@Controller("wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * POST /api/wallet/credit
   * Add credit to wallet (admin only)
   *
   * Rate limit: 10 credits per minute
   * Prevents accidental duplicate credits or abuse
   */
  @Post("credit")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("wallet.credit")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // ← ADD THIS (10 per min)
  async addCredit(@Body() body: { userId: string; amount: number; reason: string }) {
    return this.walletService.addCredit(body.userId, body.amount, body.reason);
  }

  /**
   * POST /api/wallet/debit
   * Deduct from wallet (admin only)
   *
   * Rate limit: 10 debits per minute
   */
  @Post("debit")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("wallet.debit")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // ← ADD THIS (10 per min)
  async debitWallet(@Body() body: { userId: string; amount: number; reason: string }) {
    return this.walletService.debitWallet(body.userId, body.amount, body.reason);
  }

  /**
   * GET /api/wallet
   * Get user's wallet balance
   *
   * Rate limit: 30 requests per minute (read endpoint)
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // ← ADD THIS (30 per min)
  async getWallet(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.walletService.getWallet(userId);
  }

  /**
   * GET /api/wallet/transactions
   * Get wallet transaction history
   *
   * Rate limit: 20 requests per minute
   */
  @Get("transactions")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // ← ADD THIS (20 per min)
  async getTransactions(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.walletService.getTransactions(userId);
  }
}
```

---

## Rate Limiting Strategy Summary

| Endpoint                     | Limit | TTL    | Rationale                 |
| ---------------------------- | ----- | ------ | ------------------------- |
| **Auth**                     |       |        |                           |
| POST /auth/login             | 5     | 15 min | Prevent brute-force       |
| POST /auth/register          | 3     | 15 min | Prevent spam accounts     |
| **Payments**                 |       |        |                           |
| POST /payments/create-intent | 10    | 1 min  | Prevent Stripe fee abuse  |
| POST /payments/webhook       | 100   | 1 min  | Allow Stripe bursts       |
| GET /payments/order/:id      | 30    | 1 min  | Read-heavy endpoint       |
| **Refunds**                  |       |        |                           |
| POST /refunds/order/:id      | 5     | 1 min  | Prevent double-refunds    |
| GET /refunds                 | 20    | 1 min  | Admin read                |
| **Wallet**                   |       |        |                           |
| POST /wallet/credit          | 10    | 1 min  | Prevent duplicate credits |
| POST /wallet/debit           | 10    | 1 min  | Prevent duplicate debits  |
| GET /wallet                  | 30    | 1 min  | User read                 |
| **Global Fallback**          | 100   | 1 min  | All other endpoints       |

---

## Testing the Rate Limiting

### Test 1: Login Rate Limiting

```bash
# Make 6 login attempts in < 15 minutes
for i in {1..6}; do
  curl -X POST https://api.rachelfoods.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo "\nAttempt $i"
done

# Expected: First 5 succeed (401 invalid credentials)
# 6th attempt should return 429 Too Many Requests
```

### Test 2: Payment Intent Rate Limiting

```bash
# Make 11 payment intent requests in 1 minute
for i in {1..11}; do
  curl -X POST https://api.rachelfoods.com/api/payments/create-intent \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{"orderId":"order_123"}'
  echo "\nAttempt $i"
done

# Expected: First 10 succeed (or fail with 400 if order invalid)
# 11th attempt should return 429 Too Many Requests
```

### Test 3: Verify Error Response

Expected 429 response:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Deployment Steps

1. **Make code changes** (add `@Throttle()` decorators)
2. **Build backend**:
   ```bash
   cd backend
   npm run build
   ```
3. **Test locally**:
   ```bash
   npm run start:dev
   # Run test scripts above
   ```
4. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: Add per-endpoint rate limiting for security"
   git push
   ```
5. **Deploy to production**
6. **Test in production** (use staging first if available)
7. **Monitor logs** for 429 errors (should be minimal for normal users)

---

## Monitoring Rate Limiting

### Log Analysis

Rate-limited requests will appear in logs:

```
[LoggingInterceptor] Request failed: POST /api/auth/login - 429
```

### Metrics to Track

- **429 error rate** - Should be < 0.1% of requests
- **429 by endpoint** - Identify if legitimate users are being blocked
- **429 by IP** - Detect potential attackers

### Alert Rules

```yaml
- name: High Rate Limit Rejections
  condition: rate_limit_429_count > 100 per 5 minutes
  action: Notify security team (potential attack)
```

---

## Rollback Plan

If rate limiting causes issues:

1. **Quick rollback**: Remove `@Throttle()` decorators, redeploy
2. **Adjust limits**: Increase limits if legitimate traffic affected
3. **Whitelist IPs**: Exempt trusted IPs (office, monitoring tools)

---

## Success Criteria

✅ **Login attempts** limited to 5 per 15 min  
✅ **Payment intents** limited to 10 per min  
✅ **Refunds** limited to 5 per min  
✅ **Wallet operations** limited to 10 per min  
✅ **Test scripts** confirm 429 responses  
✅ **Production logs** show rate limiting working

---

**Estimated Time**: 30 minutes  
**Priority**: 🚨 **CRITICAL** - Required before launch  
**Assigned To**: Backend Engineer  
**Status**: ⏳ **PENDING IMPLEMENTATION**

---

**After Implementation**: Update [PHASE_7_EXECUTION_REPORT.md](PHASE_7_EXECUTION_REPORT.md) and mark blocker as ✅ **RESOLVED**.
