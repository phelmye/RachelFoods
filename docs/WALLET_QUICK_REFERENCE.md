# Wallet System Quick Reference

## For Users

### Check Wallet Balance

```bash
GET /wallet/balance
Authorization: Bearer <user-token>
```

**Response:**

```json
{
  "balance": 125.5,
  "currency": "USD"
}
```

### View Wallet History

```bash
GET /wallet/history
Authorization: Bearer <user-token>
```

**Response:**

```json
[
  {
    "id": "txn-123",
    "type": "CREDIT",
    "source": "REFUND",
    "amount": 50.0,
    "reference": "order-abc",
    "metadata": { "refundId": "ref-xyz", "orderNumber": "ORD-2026-0001" },
    "createdAt": "2026-01-13T12:00:00.000Z"
  },
  {
    "id": "txn-456",
    "type": "DEBIT",
    "source": "ORDER_PAYMENT",
    "amount": 25.0,
    "reference": "order-def",
    "metadata": { "orderNumber": "ORD-2026-0002" },
    "createdAt": "2026-01-12T10:00:00.000Z"
  }
]
```

### Use Wallet at Checkout

```bash
POST /orders
Authorization: Bearer <user-token>

{
    "items": [
        {
            "productId": "prod-123",
            "variantId": "var-456",
            "quantity": 2
        }
    ],
    "deliveryAddress": "123 Main St",
    "deliveryCity": "New York",
    "deliveryState": "NY",
    "deliveryZipCode": "10001",
    "deliveryPhone": "+1234567890",
    "paymentMethod": "CARD",
    "couponCode": "SAVE20",         // Optional: Phase 5B
    "useWalletAmount": 30.00        // Optional: Phase 5C
}
```

**Order Calculation:**

```
Subtotal:        $100.00
Shipping:        $15.00
Coupon Discount: -$20.00
Wallet Used:     -$30.00
──────────────────────────
Total to Pay:    $65.00 (via Stripe/COD)
```

---

## For Admins

### Credit User Wallet

```bash
POST /wallet/admin/credit/:userId
Authorization: Bearer <admin-token>

{
    "amount": 50.00,
    "source": "ADMIN",
    "reference": "CS-2026-0001",
    "reason": "Compensation for shipping delay"
}
```

**Response:**

```json
{
  "success": true,
  "walletId": "wallet-123",
  "previousBalance": 100.0,
  "newBalance": 150.0,
  "transactionId": "txn-789"
}
```

### View User Wallet

```bash
GET /wallet/admin/user/:userId
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "id": "wallet-123",
  "userId": "user-456",
  "balance": 150.0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-13T12:00:00.000Z",
  "users": {
    "id": "user-456",
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### View User Transaction History

```bash
GET /wallet/admin/user/:userId/history
Authorization: Bearer <admin-token>
```

### Process Refund

```bash
POST /refunds/order/:orderId
Authorization: Bearer <admin-token>

{
    "refundAmount": 75.50,  // Optional: defaults to full order
    "reason": "Product damaged"
}
```

**Response:**

```json
{
  "refundId": "ref-xyz",
  "orderId": "order-123",
  "orderNumber": "ORD-2026-0001",
  "refundAmount": 75.5,
  "walletCredited": 75.5,
  "transactionId": "txn-789"
}
```

---

## Transaction Sources

| Source          | Description                  | Who Can Trigger      |
| --------------- | ---------------------------- | -------------------- |
| `REFUND`        | Order refund (Stripe or COD) | Admin only           |
| `LOYALTY`       | Loyalty rewards              | System/Admin         |
| `ADMIN`         | Manual admin credit          | Admin only           |
| `PROMO`         | Promotional credit           | System/Admin         |
| `ORDER_PAYMENT` | Wallet used for order        | Customer at checkout |

---

## Safety Rules

### ✅ What IS Allowed

- Users can view their wallet balance and history
- Users can use wallet credit at checkout (up to order total)
- Admins can manually credit wallets with reason
- Admins can process refunds that credit wallets
- System automatically debits wallet on successful order

### ❌ What is NOT Allowed

- Direct wallet balance edits
- Using more wallet than available balance
- Using more wallet than order total
- Negative wallet amounts
- Wallet credits without transaction record

---

## Wallet Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                   WALLET SOURCES                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │   REFUND   │  │    ADMIN    │  │   PROMO    │  │
│  │  (Stripe/  │  │  (Manual    │  │ (Campaign) │  │
│  │    COD)    │  │   Credit)   │  │            │  │
│  └──────┬─────┘  └──────┬──────┘  └──────┬─────┘  │
│         │               │                │        │
│         └───────────────┼────────────────┘        │
│                         ▼                          │
│                ┌─────────────────┐                 │
│                │  WALLET CREDIT  │                 │
│                │  (Transaction   │                 │
│                │    Created)     │                 │
│                └────────┬────────┘                 │
│                         ▼                          │
│                ┌─────────────────┐                 │
│                │ WALLET BALANCE  │                 │
│                │    UPDATED      │                 │
│                └────────┬────────┘                 │
│                         │                          │
└─────────────────────────┼──────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                   WALLET USAGE                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│                  ┌──────────────┐                   │
│                  │   CHECKOUT   │                   │
│                  │ (User selects│                   │
│                  │ wallet amount)│                  │
│                  └──────┬───────┘                   │
│                         │                           │
│                         ▼                           │
│                ┌─────────────────┐                  │
│                │  VALIDATION     │                  │
│                │ - Balance check │                  │
│                │ - Order total   │                  │
│                │   limit check   │                  │
│                └────────┬────────┘                  │
│                         │                           │
│                         ▼                           │
│                ┌─────────────────┐                  │
│                │  ORDER CREATED  │                  │
│                │ (totalCost =    │                  │
│                │  original -     │                  │
│                │  walletUsed)    │                  │
│                └────────┬────────┘                  │
│                         │                           │
│                         ▼                           │
│                ┌─────────────────┐                  │
│                │  WALLET DEBIT   │                  │
│                │  (Transaction   │                  │
│                │    Created)     │                  │
│                └────────┬────────┘                  │
│                         │                           │
│                         ▼                           │
│                ┌─────────────────┐                  │
│                │ WALLET BALANCE  │                  │
│                │    UPDATED      │                  │
│                └─────────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Example Calculations

### Example 1: Full Wallet Usage

```
Cart:
- Products: $80.00
- Shipping: $15.00
- Subtotal: $95.00

Available Wallet: $100.00
Use Wallet: $95.00 ✓ (exactly order total)

Result:
- Wallet Debited: $95.00
- New Wallet Balance: $5.00
- Amount to Pay (Stripe/COD): $0.00
```

### Example 2: Partial Wallet Usage

```
Cart:
- Products: $150.00
- Shipping: $20.00
- Subtotal: $170.00

Available Wallet: $50.00
Use Wallet: $50.00 ✓

Result:
- Wallet Debited: $50.00
- New Wallet Balance: $0.00
- Amount to Pay (Stripe/COD): $120.00
```

### Example 3: Wallet + Coupon

```
Cart:
- Products: $200.00
- Shipping: $25.00
- Subtotal: $225.00

Coupon: SAVE20 (20% off) = -$40.00
Subtotal after coupon: $185.00

Available Wallet: $85.00
Use Wallet: $85.00 ✓

Result:
- Wallet Debited: $85.00
- New Wallet Balance: $0.00
- Amount to Pay (Stripe/COD): $100.00
```

### Example 4: Refund Credits Wallet

```
Order ORD-2026-0001:
- Subtotal: $100.00
- Shipping: $15.00
- Coupon Discount: -$20.00
- Wallet Used: -$30.00
- Paid via Stripe: $65.00

Customer Wallet Before Refund: $10.00

Refund Amount: $95.00
(Stripe $65.00 + Wallet $30.00, coupon discount not refunded)

Customer Wallet After Refund: $105.00
```

---

## Database Queries

### Check User Wallet Balance

```sql
SELECT balance
FROM store_credit_wallets
WHERE userId = 'user-123';
```

### View User Transaction History

```sql
SELECT *
FROM wallet_transactions
WHERE walletId = 'wallet-456'
ORDER BY createdAt DESC
LIMIT 50;
```

### Find All Refund Credits

```sql
SELECT wt.*, o.orderNumber
FROM wallet_transactions wt
JOIN store_credit_wallets w ON w.id = wt.walletId
JOIN orders o ON o.id = wt.reference
WHERE wt.source = 'REFUND'
ORDER BY wt.createdAt DESC;
```

### Find Orders Using Wallet

```sql
SELECT orderNumber, walletUsed, totalCost
FROM orders
WHERE walletUsed > 0
ORDER BY createdAt DESC;
```

### Audit Trail for Specific Transaction

```sql
SELECT
    wt.id,
    wt.type,
    wt.source,
    wt.amount,
    wt.reference,
    wt.metadata,
    wt.createdAt,
    w.userId,
    u.email
FROM wallet_transactions wt
JOIN store_credit_wallets w ON w.id = wt.walletId
JOIN users u ON u.id = w.userId
WHERE wt.id = 'txn-123';
```

---

## Error Messages

| Error                               | Cause                                  | Solution                                  |
| ----------------------------------- | -------------------------------------- | ----------------------------------------- |
| "Insufficient wallet balance"       | User trying to use more than available | Reduce wallet amount or add more credit   |
| "Wallet amount exceeds order total" | User trying to use $100 on $50 order   | Cap wallet usage at order total           |
| "Wallet not found for user"         | User has no wallet yet                 | System auto-creates on first credit/debit |
| "Wallet already exists for user"    | Duplicate wallet creation attempt      | Use existing wallet (unique constraint)   |
| "Amount must be positive"           | Negative or zero amount                | Use positive numbers only                 |

---

## Testing Scenarios

### Test 1: Create Order with Wallet

```bash
# 1. Check initial balance
GET /wallet/balance
# Response: { "balance": 100.00 }

# 2. Create order using $50 wallet
POST /orders
{ "items": [...], "useWalletAmount": 50.00 }

# 3. Verify order created with walletUsed = 50
GET /orders/:orderId
# Response: { "walletUsed": 50.00, "totalCost": 65.00 }

# 4. Verify wallet debited
GET /wallet/balance
# Response: { "balance": 50.00 }

# 5. Verify transaction logged
GET /wallet/history
# Response: [{ "type": "DEBIT", "amount": 50.00, "source": "ORDER_PAYMENT" }]
```

### Test 2: Process Refund

```bash
# 1. Admin processes refund
POST /refunds/order/:orderId
{ "reason": "Customer requested" }

# 2. Verify user wallet credited
GET /wallet/balance
# Response: { "balance": 165.00 }  # Previous $50 + $115 refund

# 3. Verify refund transaction
GET /wallet/history
# Response: [{ "type": "CREDIT", "amount": 115.00, "source": "REFUND" }]
```

### Test 3: Admin Manual Credit

```bash
# 1. Admin credits wallet
POST /wallet/admin/credit/user-123
{ "amount": 25.00, "source": "ADMIN", "reason": "Goodwill gesture" }

# 2. Verify user wallet updated
GET /wallet/admin/user/user-123
# Response: { "balance": 190.00 }

# 3. Verify transaction with metadata
GET /wallet/admin/user/user-123/history
# Response includes metadata with adminId and reason
```

---

## Permissions Required

| Endpoint                          | Permission                      |
| --------------------------------- | ------------------------------- |
| GET /wallet/balance               | Authenticated user (own wallet) |
| GET /wallet/history               | Authenticated user (own wallet) |
| POST /wallet/admin/credit/:userId | `wallet.manage`                 |
| GET /wallet/admin/user/:userId    | `wallet.view`                   |
| POST /refunds/order/:orderId      | `refund.process`                |
| GET /refunds/:refundId            | `refund.view`                   |
| GET /refunds/                     | `refund.view`                   |

---

## Best Practices

1. **Always validate balance before order creation**

   ```typescript
   const balance = await walletService.getBalance(userId);
   if (balance < useWalletAmount) throw new BadRequestException();
   ```

2. **Log all wallet operations**

   ```typescript
   this.logger.log({ event: "wallet_credited", userId, amount });
   ```

3. **Include metadata for audit trail**

   ```typescript
   await walletService.creditWallet(userId, amount, "REFUND", orderId, {
     refundId,
     orderNumber,
     paymentMethod,
     adminId,
   });
   ```

4. **Never bypass WalletService**

   ```typescript
   // ❌ WRONG
   await prisma.store_credit_wallets.update({ balance: ... });

   // ✅ CORRECT
   await walletService.creditWallet(userId, amount, source, ref);
   ```

5. **Handle wallet debit failures gracefully**
   ```typescript
   try {
       await walletService.debitWallet(...);
   } catch (error) {
       this.logger.error('Wallet debit failed', { orderId, error });
       // Alert admin, order already created
   }
   ```

---

## Support

For issues or questions:

1. Check wallet balance and transaction history
2. Review error messages in backend logs
3. Query wallet_transactions table for audit trail
4. Verify database migration applied correctly
5. Check [PHASE_5C_WALLET_SYSTEM.md](./PHASE_5C_WALLET_SYSTEM.md) for details
