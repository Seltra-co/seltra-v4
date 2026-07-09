/*
  Warnings:

  - You are about to drop the column `notionPageId` on the `MerchantApplication` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId]` on the table `MerchantApplication` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `TenantEvent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TenantEventType" AS ENUM ('product_added', 'order_placed', 'payment_received', 'login', 'settings_changed', 'theme_updated', 'ai_invocation', 'merchant_onboarded');

-- AlterTable
ALTER TABLE "MerchantApplication" DROP COLUMN "notionPageId",
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "merchantContext" JSONB;

-- AlterTable
ALTER TABLE "TenantEvent" DROP COLUMN "type",
ADD COLUMN     "type" "TenantEventType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MerchantApplication_tenantId_key" ON "MerchantApplication"("tenantId");

-- CreateIndex
CREATE INDEX "TenantEvent_type_createdAt_idx" ON "TenantEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "MerchantApplication" ADD CONSTRAINT "MerchantApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
