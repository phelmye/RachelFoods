-- Phase 3A Schema Migration
-- Adds User.role field and changes Product.images to imageUrl

-- Create UserRole enum if not exists
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
        CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
    END IF;
END $$;

-- For existing products: Rename images to imageUrl if images column exists
-- This is a destructive change - only run if you want to convert arrays to single strings
DO $$ 
BEGIN
    -- Check if products table exists and has images column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='products') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='images') THEN
            
            -- Add imageUrl column
            ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
            
            -- Migrate data: take first image from array
            UPDATE "products" 
            SET "imageUrl" = "images"[1]
            WHERE "images" IS NOT NULL AND array_length("images", 1) > 0;
            
            -- Drop old images column
            ALTER TABLE "products" DROP COLUMN IF EXISTS "images";
        END IF;
    END IF;
END $$;

-- Grant schema permissions (for local dev only)
GRANT ALL ON SCHEMA public TO rachelfood;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rachelfood;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rachelfood;
