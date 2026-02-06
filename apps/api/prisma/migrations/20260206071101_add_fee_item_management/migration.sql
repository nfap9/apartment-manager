-- CreateTable
CREATE TABLE "FeeItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "FeeMode" NOT NULL,
    "defaultFixedAmountCents" INTEGER,
    "defaultUnitPriceCents" INTEGER,
    "defaultUnitName" TEXT,
    "defaultBillingTiming" "BillingTiming",
    "hasSpecs" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeItemSpec" (
    "id" TEXT NOT NULL,
    "feeItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fixedAmountCents" INTEGER,
    "unitPriceCents" INTEGER,
    "unitName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeItemSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeItem_organizationId_idx" ON "FeeItem"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeItem_organizationId_feeType_name_key" ON "FeeItem"("organizationId", "feeType", "name");

-- CreateIndex
CREATE INDEX "FeeItemSpec_feeItemId_idx" ON "FeeItemSpec"("feeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeItemSpec_feeItemId_name_key" ON "FeeItemSpec"("feeItemId", "name");

-- AddForeignKey
ALTER TABLE "FeeItem" ADD CONSTRAINT "FeeItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeItemSpec" ADD CONSTRAINT "FeeItemSpec_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
