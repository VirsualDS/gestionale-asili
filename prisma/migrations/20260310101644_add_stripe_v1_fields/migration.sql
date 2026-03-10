/*
  Warnings:

  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeChargeId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCheckoutSessionId]` on the table `PaymentRequest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeAccountId]` on the table `Structure` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "applicationFeeAmount" DECIMAL(10,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'eur',
ADD COLUMN     "grossAmount" DECIMAL(10,2),
ADD COLUMN     "netAmountToStructure" DECIMAL(10,2),
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN     "lastPaymentAttemptAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutExpiresAt" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripeCheckoutUrl" TEXT;

-- AlterTable
ALTER TABLE "Structure" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeAccountStatus" TEXT,
ADD COLUMN     "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeOnboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "stripeOnboardingStartedAt" TIMESTAMP(3),
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeChargeId_key" ON "Payment"("stripeChargeId");

-- CreateIndex
CREATE INDEX "Payment_stripeCheckoutSessionId_idx" ON "Payment"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_stripeCheckoutSessionId_key" ON "PaymentRequest"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "PaymentRequest_publicToken_idx" ON "PaymentRequest"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Structure_stripeAccountId_key" ON "Structure"("stripeAccountId");
