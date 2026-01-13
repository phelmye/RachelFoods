# Coupon System Quick Start Guide

## For Backend Developers

### 1. Apply Database Migration

**Method 1: Manual SQL (Recommended if permission issues)**

```bash
# Using psql command line
psql -h 127.0.0.1 -U rachelfood -d rachelfood -f backend/prisma/migrations/manual_add_coupon_system.sql

# Or copy SQL contents and run in pgAdmin
```

**Method 2: Prisma Migrate (requires CREATEDB permission)**

```bash
cd backend
npx prisma migrate dev --name add_coupon_system
```

**Method 3: Prisma DB Push (alternative)**

```bash
cd backend
npx prisma db push
```

---

## For Admin Users

### Create a Coupon

**Endpoint:** `POST /admin/coupons`  
**Auth:** Requires admin JWT token with `coupon.create` permission

**Example 1: Percentage Discount**

```json
{
  "code": "SAVE20",
  "type": "PERCENT",
  "value": 20,
  "maxUses": 100,
  "minOrderAmount": 50,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "isActive": true
}
```

**Result:** 20% off for orders $50+, limited to 100 uses, expires Dec 31, 2026

**Example 2: Fixed Amount Discount**

```json
{
  "code": "WELCOME10",
  "type": "FIXED",
  "value": 10,
  "maxUses": null,
  "minOrderAmount": null,
  "expiresAt": null,
  "isActive": true
}
```

**Result:** $10 off any order, unlimited uses, never expires

---

### List All Coupons

**Endpoint:** `GET /admin/coupons`  
**Auth:** Requires admin JWT token with `coupon.view` permission

**Query Parameters:**

- `?includeInactive=true` - Include inactive coupons

**Response:**

```json
[
  {
    "id": "clx1234567890",
    "code": "SAVE20",
    "type": "PERCENT",
    "value": 20.0,
    "maxUses": 100,
    "usedCount": 45,
    "minOrderAmount": 50.0,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "isActive": true,
    "createdAt": "2026-01-13T10:00:00.000Z",
    "updatedAt": "2026-01-13T10:00:00.000Z",
    "createdBy": "admin-user-id"
  }
]
```

---

### Get Coupon Statistics

**Endpoint:** `GET /admin/coupons/:id/stats`  
**Auth:** Requires admin JWT token with `coupon.view` permission

**Response:**

```json
{
  "id": "clx1234567890",
  "code": "SAVE20",
  "usagePercentage": 45.0,
  "remainingUses": 55,
  "isExpired": false,
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

---

### Update Coupon

**Endpoint:** `PUT /admin/coupons/:id`  
**Auth:** Requires admin JWT token with `coupon.update` permission

**Updatable Fields:**

- `maxUses` - Change usage limit
- `isActive` - Enable/disable coupon
- `expiresAt` - Extend or set expiration

**Example: Disable a coupon**

```json
{
  "isActive": false
}
```

**Example: Extend expiration**

```json
{
  "expiresAt": "2027-12-31T23:59:59.000Z"
}
```

---

### Delete Coupon

**Endpoint:** `DELETE /admin/coupons/:id`  
**Auth:** Requires admin JWT token with `coupon.delete` permission

**Note:** This is a soft delete - sets `isActive = false`

---

## For Frontend Developers

### Validate Coupon at Checkout

**Endpoint:** `POST /admin/coupons/validate`  
**Auth:** Public endpoint (no token required)

**Request:**

```json
{
  "code": "SAVE20",
  "orderSubtotal": 100.0
}
```

**Success Response:**

```json
{
  "isValid": true,
  "discountAmount": 20.0,
  "coupon": {
    "code": "SAVE20",
    "type": "PERCENT",
    "value": 20.0,
    "minOrderAmount": 50.0,
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
}
```

**Error Response:**

```json
{
  "isValid": false,
  "discountAmount": 0,
  "error": "Coupon has expired"
}
```

---

### Apply Coupon to Order

**Endpoint:** `POST /orders`  
**Auth:** Requires user JWT token

**Request:**

```json
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
  "couponCode": "SAVE20"
}
```

**Success Response:**

```json
{
  "id": "order-789",
  "orderNumber": "ORD-2026-0001",
  "subtotal": 100.0,
  "shippingCost": 15.0,
  "discountAmount": 20.0,
  "couponCode": "SAVE20",
  "totalCost": 95.0,
  "status": "PENDING",
  "paymentStatus": "UNPAID"
}
```

**Error Scenarios:**

```json
// Invalid coupon
{
    "statusCode": 400,
    "message": "Coupon not found or inactive"
}

// Expired coupon
{
    "statusCode": 400,
    "message": "Coupon has expired"
}

// Usage limit reached
{
    "statusCode": 400,
    "message": "Coupon usage limit reached"
}

// Minimum order not met
{
    "statusCode": 400,
    "message": "Order must be at least $50.00 to use this coupon"
}
```

---

## Frontend Integration Example

### React Checkout Component

```typescript
import { useState } from 'react';

function Checkout() {
    const [couponCode, setCouponCode] = useState('');
    const [couponValid, setCouponValid] = useState(false);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [couponError, setCouponError] = useState('');

    const orderSubtotal = 100.00; // Calculate from cart

    const validateCoupon = async () => {
        try {
            const response = await fetch('/admin/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: couponCode,
                    orderSubtotal: orderSubtotal
                })
            });

            const data = await response.json();

            if (data.isValid) {
                setCouponValid(true);
                setDiscountAmount(data.discountAmount);
                setCouponError('');
            } else {
                setCouponValid(false);
                setDiscountAmount(0);
                setCouponError(data.error);
            }
        } catch (error) {
            setCouponError('Failed to validate coupon');
        }
    };

    const placeOrder = async () => {
        try {
            const response = await fetch('/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    items: cartItems,
                    deliveryAddress: '123 Main St',
                    // ... other fields
                    couponCode: couponValid ? couponCode : undefined
                })
            });

            const order = await response.json();
            console.log('Order created:', order);
        } catch (error) {
            console.error('Order failed:', error);
        }
    };

    return (
        <div>
            <h2>Checkout</h2>

            <div className="order-summary">
                <p>Subtotal: ${orderSubtotal.toFixed(2)}</p>
                <p>Shipping: $15.00</p>

                {couponValid && (
                    <p className="discount">
                        Discount ({couponCode}): -${discountAmount.toFixed(2)}
                    </p>
                )}

                <p className="total">
                    Total: ${(orderSubtotal + 15 - discountAmount).toFixed(2)}
                </p>
            </div>

            <div className="coupon-input">
                <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <button onClick={validateCoupon}>Apply</button>

                {couponValid && (
                    <p className="success">
                        ✓ Coupon applied! You save ${discountAmount.toFixed(2)}
                    </p>
                )}

                {couponError && (
                    <p className="error">{couponError}</p>
                )}
            </div>

            <button onClick={placeOrder}>Place Order</button>
        </div>
    );
}
```

---

## Testing Checklist

### Backend Testing

- [ ] Create coupon with percentage discount
- [ ] Create coupon with fixed discount
- [ ] Create coupon with usage limit
- [ ] Create coupon with minimum order amount
- [ ] Create coupon with expiration date
- [ ] Validate active coupon (should succeed)
- [ ] Validate inactive coupon (should fail)
- [ ] Validate expired coupon (should fail)
- [ ] Validate coupon with usage limit reached (should fail)
- [ ] Validate coupon with order below minimum (should fail)
- [ ] Create order with valid coupon (discount applied)
- [ ] Create order with invalid coupon (error thrown)
- [ ] Verify coupon usage count increments
- [ ] Verify Stripe payment uses discounted total
- [ ] Verify COD order uses discounted total

### Frontend Testing

- [ ] Coupon input accepts text
- [ ] Coupon code normalized to uppercase
- [ ] Validation button calls API
- [ ] Success message shows discount amount
- [ ] Error message shows validation error
- [ ] Order summary updates with discount
- [ ] Total price recalculates correctly
- [ ] Order creation includes couponCode
- [ ] Order confirmation shows discount

---

## Common Errors and Solutions

### Error: "Coupon not found or inactive"

**Cause:** Coupon doesn't exist or `isActive = false`  
**Solution:** Check coupon code spelling, verify coupon exists in database

### Error: "Coupon has expired"

**Cause:** Current time > `expiresAt`  
**Solution:** Check expiration date, extend if needed using UPDATE endpoint

### Error: "Coupon usage limit reached"

**Cause:** `usedCount >= maxUses`  
**Solution:** Increase `maxUses` or create new coupon

### Error: "Order must be at least $X to use this coupon"

**Cause:** `orderSubtotal < minOrderAmount`  
**Solution:** Add more items to cart or use different coupon

### Error: "permission denied to create database"

**Cause:** Prisma Migrate needs shadow database, user lacks permission  
**Solution:** Use manual SQL migration file instead

---

## Security Best Practices

### ✅ DO:

- Always validate coupons on backend during order creation
- Use server-side validation as source of truth
- Store discount amount in order record for audit trail
- Log coupon usage for analytics
- Implement rate limiting on validation endpoint
- Require admin permissions for coupon CRUD operations

### ❌ DON'T:

- Trust client-side coupon validation alone
- Allow users to specify discount amount directly
- Modify base product prices in database
- Allow negative discount amounts
- Skip validation if coupon "was validated before"
- Expose admin endpoints without authentication

---

## Performance Considerations

### Database Indexes

The following indexes are created for optimal performance:

- `coupons_code_idx` - Fast lookup by coupon code
- `coupons_isActive_idx` - Filter active/inactive coupons
- `coupons_expiresAt_idx` - Check expiration efficiently

### Caching Recommendations (Optional)

Consider caching coupon data for high-traffic sites:

```typescript
// Cache active coupons in Redis
const cachedCoupon = await redis.get(`coupon:${code}`);
if (cachedCoupon) {
  return JSON.parse(cachedCoupon);
}

const coupon = await prisma.coupons.findUnique({ where: { code } });
await redis.set(`coupon:${code}`, JSON.stringify(coupon), "EX", 300); // 5 min TTL
```

### Rate Limiting

Protect validation endpoint from abuse:

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
@Post('/admin/coupons/validate')
async validate() { ... }
```

---

## Support and Troubleshooting

For issues or questions:

1. Check this documentation
2. Review error messages in backend logs
3. Verify database schema applied correctly
4. Test with Postman/curl before frontend integration
5. Check [PHASE_5B_PROMOTIONS.md](./PHASE_5B_PROMOTIONS.md) for technical details
