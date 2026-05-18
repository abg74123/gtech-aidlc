-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "master_data";
CREATE SCHEMA IF NOT EXISTS "transactions";
CREATE SCHEMA IF NOT EXISTS "warehouse";
CREATE SCHEMA IF NOT EXISTS "reports";

-- CreateEnum
CREATE TYPE "master_data"."Role" AS ENUM ('CASHIER', 'STORE', 'SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN');

-- CreateTable
CREATE TABLE "master_data"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "roles" "master_data"."Role"[] DEFAULT ARRAY[]::"master_data"."Role"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data"."refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "master_data"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "master_data"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "master_data"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user_active" ON "master_data"."refresh_tokens"("user_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "master_data"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "master_data"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
