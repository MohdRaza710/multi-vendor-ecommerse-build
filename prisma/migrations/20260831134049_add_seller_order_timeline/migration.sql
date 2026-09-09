-- AlterTable
ALTER TABLE "OrderTimeline" ADD COLUMN     "sellerOrderId" TEXT;

-- CreateIndex
CREATE INDEX "OrderTimeline_sellerOrderId_createdAt_idx" ON "OrderTimeline"("sellerOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderTimeline" ADD CONSTRAINT "OrderTimeline_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
