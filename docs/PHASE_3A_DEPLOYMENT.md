# Phase 3A Deployment Guide

## ✅ Completed Changes

### Schema Changes

- ✅ Changed `Product.images: String[]` → `Product.imageUrl: String`
- ✅ Added `UserRole` enum (ADMIN, STAFF, CUSTOMER)
- ✅ Added `User.role: UserRole` field with CUSTOMER default
- ✅ Fixed all service references to use `imageUrl`
- ✅ Removed product-level `sku` handling
- ✅ Fixed relation names (`variants` instead of `product_variants`)

### Backend Changes

- ✅ Admin product service aligned with schema
- ✅ Admin order service complete
- ✅ RBAC guards implemented (@Roles decorator + RolesGuard)
- ✅ All DTOs updated
- ✅ Backend builds successfully (no TypeScript errors)

### Frontend Changes

- ✅ Admin dashboard with real-time stats
- ✅ Product management UI (list, create, edit)
- ✅ Order management UI (list, filter, pagination)
- ✅ Admin API integration complete
- ✅ Frontend builds successfully

---

## 🚀 Deployment Steps

### Step 1: Fix Local Database Permissions

The local PostgreSQL database needs proper permissions for the `rachelfood` user.

**Connect to PostgreSQL as superuser (postgres):**

```bash
# Windows (if psql is installed)
psql -U postgres -d rachelfood

# Or use pgAdmin, DBeaver, or any PostgreSQL client
```

**Grant permissions:**

```sql
-- Grant schema permissions
GRANT ALL ON SCHEMA public TO rachelfood;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rachelfood;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rachelfood;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rachelfood;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rachelfood;

-- If using Prisma Migrate, also need:
ALTER USER rachelfood CREATEDB;
```

### Step 2: Apply Database Migration

**Option A: Fresh Database (Recommended for Dev)**

```bash
cd backend
npx prisma db push --force-reset --accept-data-loss
```

This will:

- Drop all existing data
- Create all tables from schema
- Add UserRole enum
- Add role field to users
- Use imageUrl for products

**Option B: Preserve Existing Data**

If you have existing data you want to keep:

```bash
cd backend

# Run manual migration SQL
psql -U postgres -d rachelfood -f migrations/phase3a_manual.sql

# Or apply through pgAdmin/DBeaver
```

The manual migration (`migrations/phase3a_manual.sql`) will:

- Create UserRole enum
- Add role field with CUSTOMER default
- Migrate images[0] → imageUrl (takes first image)
- Drop images column

**Option C: Use Prisma Migrate (If Permissions Fixed)**

```bash
cd backend
npx prisma migrate dev --name add_user_role_and_imageurl
```

### Step 3: Seed Initial Data

**3a. Seed Products (if fresh database):**

```bash
cd backend
npm run build
node dist/main.js
# Navigate to http://localhost:3001/api/seed/products
```

**3b. Seed Admin User:**

```bash
cd backend

# Set admin credentials (optional)
$env:ADMIN_EMAIL="admin@rachelfoods.com"
$env:ADMIN_PASSWORD="SecurePassword123!"

# Run seed script
npx ts-node scripts/seed-admin.ts
```

**3c. Manual Admin Creation (Alternative):**

```sql
-- Create admin user directly in database
INSERT INTO users (
    id, email, password, "firstName", "lastName",
    role, status, "emailVerified",
    "createdAt", "updatedAt"
) VALUES (
    'usr_' || gen_random_uuid(),
    'admin@rachelfoods.com',
    '$2b$10$YourBcryptHashHere', -- Use bcrypt.hash('YourPassword', 10)
    'Admin',
    'User',
    'ADMIN',
    'ACTIVE',
    true,
    NOW(),
    NOW()
);
```

Or upgrade existing user:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

### Step 4: Verify Backend

```bash
cd backend
npm run build  # Should succeed with no errors
npm run start:dev

# Test endpoints:
# http://localhost:3001/api/health
# http://localhost:3001/api/products
```

### Step 5: Verify Frontend

```bash
cd frontend
npm run build  # Should succeed
npm run dev

# Test pages:
# http://localhost:3000/admin (should redirect to login if not authenticated)
# http://localhost:3000/login (login with admin credentials)
# http://localhost:3000/admin (should load after login)
```

### Step 6: Test Admin Features

1. **Login as Admin:**
   - Email: admin@rachelfoods.com
   - Password: (what you set during seeding)

2. **Test Dashboard:**
   - Navigate to `/admin`
   - Verify stats are loading
   - Check for any console errors

3. **Test Product Management:**
   - Click "Products" in admin nav
   - Create a new product
   - Edit existing product
   - Delete product (ADMIN only)

4. **Test Order Management:**
   - Click "Orders" in admin nav
   - Filter by status
   - View order details
   - Update order status

5. **Test Role Protection:**
   - Logout
   - Login as regular customer
   - Try accessing `/admin` (should be redirected/denied)

---

## 🔒 Security Checklist

- [ ] Admin user created with strong password
- [ ] JWT_SECRET changed from default in production .env
- [ ] Database credentials secured
- [ ] Role field properly indexed
- [ ] RBAC guards applied to all admin endpoints
- [ ] Frontend route protection working
- [ ] Delete operations restricted to ADMIN role only

---

## 📊 Production Deployment

### Render.com Backend

1. **Update Environment Variables:**

   ```
   DATABASE_URL=<your-render-postgresql-url>
   JWT_SECRET=<strong-random-secret>
   JWT_EXPIRATION=7d
   ADMIN_EMAIL=<your-admin-email>
   ```

2. **Apply Migration:**
   - Connect to Render PostgreSQL via CLI or GUI
   - Run migration SQL manually
   - Or enable Prisma Migrate in production

3. **Redeploy:**

   ```bash
   git add .
   git commit -m "feat(admin): Phase 3A complete - RBAC, admin APIs, dashboard"
   git push origin main
   ```

4. **Seed Admin:**
   - SSH into Render instance or use web shell
   - Run `npm run seed:admin` (add to package.json)

### Vercel Frontend

Frontend should auto-deploy on git push. No additional steps needed.

---

## 🐛 Troubleshooting

### Backend won't build

```bash
cd backend
npx prisma generate  # Regenerate Prisma Client
npm run build
```

### Migration permission errors

- Grant permissions to database user (see Step 1)
- Or use manual SQL migration
- Or connect as postgres user temporarily

### Admin user can't login

- Check user exists: `SELECT * FROM users WHERE role='ADMIN';`
- Verify password hash is valid
- Check JWT_SECRET is set
- Verify role field exists on users table

### Dashboard shows 500 errors

- Check backend logs for errors
- Verify all endpoints return data
- Check Prisma Client includes `role` field
- Ensure database has UserRole enum

### Products show no images

- Update existing products: `UPDATE products SET "imageUrl" = images[1] WHERE "imageUrl" IS NULL;`
- Or re-seed products
- Or manually set imageUrl for each product

---

## 📝 Next Steps (Phase 3B)

Once Phase 3A is deployed and verified:

- [ ] Complete variant CRUD UI
- [ ] Add order detail page with status updates
- [ ] Implement category management
- [ ] Add user management (list users, change roles)
- [ ] Image upload functionality (Cloudinary/S3)
- [ ] Advanced analytics dashboard
- [ ] Inventory alerts
- [ ] Bulk operations
- [ ] Export to CSV
- [ ] Audit log system

---

## 📄 Migration SQL Reference

If you need to run migrations manually, use:

```sql
-- Phase 3A Manual Migration
-- See: backend/migrations/phase3a_manual.sql

-- Creates:
-- - UserRole enum (ADMIN, STAFF, CUSTOMER)
-- - users.role field with index
-- - Converts products.images[] to products.imageUrl
-- - Grants necessary permissions
```

---

## ✅ Success Criteria

Phase 3A is successfully deployed when:

1. ✅ Backend builds without errors
2. ✅ Frontend builds without errors
3. ✅ Database has UserRole enum and role field
4. ✅ Admin user exists and can login
5. ✅ Admin dashboard loads with real stats
6. ✅ Product CRUD works end-to-end
7. ✅ Order list loads with filtering
8. ✅ Regular users cannot access admin pages
9. ✅ Delete operations only work for ADMIN role
10. ✅ No console errors in browser or server logs

---

**Status**: ✅ Backend complete | ⚠️ Database migration pending | ✅ Frontend complete

**Blocker**: Local PostgreSQL permissions need to be granted before migration can proceed.

**Next Action**: Fix database permissions and run Step 2 (Apply Database Migration).
