-- CreateEnum
CREATE TYPE "BillingTiming" AS ENUM ('PREPAID', 'POSTPAID');

-- AlterTable
ALTER TABLE "LeaseCharge" ADD COLUMN     "billingTiming" "BillingTiming";

-- AlterTable: 添加新字段
ALTER TABLE "RoomFacility" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originalPriceCents" INTEGER,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "yearsInUse" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "valueCents" DROP NOT NULL;

-- 数据迁移：将valueCents复制到originalPriceCents，设置默认type
UPDATE "RoomFacility" 
SET 
  "originalPriceCents" = COALESCE("valueCents", 0),
  "type" = '其他'
WHERE "originalPriceCents" IS NULL OR "type" IS NULL;

-- 将新字段设为NOT NULL
ALTER TABLE "RoomFacility" 
  ALTER COLUMN "type" SET NOT NULL,
  ALTER COLUMN "originalPriceCents" SET NOT NULL,
  ALTER COLUMN "originalPriceCents" SET DEFAULT 0;

-- 删除旧字段valueCents
ALTER TABLE "RoomFacility" DROP COLUMN "valueCents";
