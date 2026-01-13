# Phase 4A Migration Guide

## Database Migration Required

The Phase 4A implementation adds two new tables to the database:

- `RefillProfile` - For user refill profiles
- `Address` - For user delivery addresses

## Migration Steps

### Option 1: Using Prisma Migrate (Recommended for Production)

```bash
cd backend
npx prisma migrate dev --name add_refill_and_address_tables
```

This will:

1. Create a new migration file in `prisma/migrations/`
2. Apply the migration to your development database
3. Regenerate the Prisma Client

### Option 2: Using Prisma DB Push (Quick Development)

```bash
cd backend
npx prisma db push
```

This will directly sync your Prisma schema with the database without creating a migration file.

### Option 3: Manual SQL (If Permissions Are Limited)

If you encounter permission errors, you may need to run the SQL manually with a database admin account:

```sql
-- Create RefillProfile table
CREATE TABLE "RefillProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "lastOrderedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefillProfile_pkey" PRIMARY KEY ("id")
);

-- Create Address table
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "RefillProfile_userId_idx" ON "RefillProfile"("userId");
CREATE INDEX "RefillProfile_productId_idx" ON "RefillProfile"("productId");
CREATE INDEX "RefillProfile_variantId_idx" ON "RefillProfile"("variantId");
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- Add foreign keys
ALTER TABLE "RefillProfile" ADD CONSTRAINT "RefillProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillProfile" ADD CONSTRAINT "RefillProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillProfile" ADD CONSTRAINT "RefillProfile_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Verifying Migration

After running the migration, verify it was successful:

```bash
# Check tables exist
npx prisma studio

# Or check via SQL
psql -d rachelfood -c "\dt RefillProfile Address"
```

## Troubleshooting

### Permission Denied Errors

If you see:

```
ERROR: permission denied for schema public
ERROR: permission denied to create database
```

**Solution**: Contact your database administrator to grant the necessary permissions, or run the manual SQL with an admin account.

### Migration Already Applied

If you see:

```
The migration has already been applied to the database
```

This is fine! The migration has already been run. Just regenerate the Prisma Client:

```bash
npx prisma generate
```

## Rolling Back (If Needed)

If you need to rollback the migration:

```bash
# For Prisma Migrate
npx prisma migrate reset  # WARNING: This resets ALL data!

# Or manually drop tables
psql -d rachelfood -c "DROP TABLE IF EXISTS \"RefillProfile\" CASCADE;"
psql -d rachelfood -c "DROP TABLE IF EXISTS \"Address\" CASCADE;"
```

## Post-Migration Steps

1. **Regenerate Prisma Client** (if not done automatically):

   ```bash
   cd backend
   npx prisma generate
   ```

2. **Rebuild Backend**:

   ```bash
   npm run build
   ```

3. **Restart Backend Server**:

   ```bash
   npm run start:dev
   ```

4. **Test Endpoints**:
   - GET /api/refill - Should return empty array
   - POST /api/refill/create - Should create refill profile
   - GET /api/address - Should return empty array
   - POST /api/address - Should create address

## Production Deployment

For production, use Prisma Migrate:

```bash
# Generate migration file
npx prisma migrate dev --name add_refill_and_address_tables

# Deploy to production
npx prisma migrate deploy
```

This ensures:

- Migration history is tracked
- Database schema is versioned
- Changes can be rolled back if needed
- Other team members can sync their databases
