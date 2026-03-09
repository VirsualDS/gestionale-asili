-- CreateEnum
CREATE TYPE "PaymentSetupStatus" AS ENUM ('not_configured', 'pending', 'enabled', 'blocked');

-- AlterTable
ALTER TABLE "Structure" ADD COLUMN     "paymentSetupStatus" "PaymentSetupStatus" NOT NULL DEFAULT 'not_configured';
