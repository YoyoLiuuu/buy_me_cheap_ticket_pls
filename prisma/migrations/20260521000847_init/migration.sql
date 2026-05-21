-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "legs" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "flexibility" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "alertThreshold" INTEGER NOT NULL DEFAULT 10,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRecord" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cheapestPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "topResults" JSONB NOT NULL,

    CONSTRAINT "PriceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedSearch_token_key" ON "SavedSearch"("token");

-- CreateIndex
CREATE INDEX "SavedSearch_email_idx" ON "SavedSearch"("email");

-- CreateIndex
CREATE INDEX "SavedSearch_active_idx" ON "SavedSearch"("active");

-- CreateIndex
CREATE INDEX "PriceRecord_searchId_checkedAt_idx" ON "PriceRecord"("searchId", "checkedAt");

-- CreateIndex
CREATE INDEX "AlertLog_searchId_sentAt_idx" ON "AlertLog"("searchId", "sentAt");

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
