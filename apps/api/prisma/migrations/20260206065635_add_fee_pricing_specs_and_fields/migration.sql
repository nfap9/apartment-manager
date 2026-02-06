-- AlterTable
ALTER TABLE "ApartmentFeePricing" ADD COLUMN     "billingTiming" "BillingTiming",
ADD COLUMN     "hasSpecs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "FeePricingSpec" (
    "id" TEXT NOT NULL,
    "feePricingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fixedAmountCents" INTEGER,
    "unitPriceCents" INTEGER,
    "unitName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePricingSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeePricingSpec_feePricingId_idx" ON "FeePricingSpec"("feePricingId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePricingSpec_feePricingId_name_key" ON "FeePricingSpec"("feePricingId", "name");

-- AddForeignKey
ALTER TABLE "FeePricingSpec" ADD CONSTRAINT "FeePricingSpec_feePricingId_fkey" FOREIGN KEY ("feePricingId") REFERENCES "ApartmentFeePricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
