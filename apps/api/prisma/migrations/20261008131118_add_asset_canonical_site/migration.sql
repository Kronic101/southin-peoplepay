-- DropIndex
DROP INDEX "Site_isActive_idx";

-- DropIndex
DROP INDEX "Site_siteGroupId_idx";

-- AlterTable
ALTER TABLE "hub_assets" ADD COLUMN     "siteId" TEXT;

-- CreateIndex
CREATE INDEX "hub_assets_siteId_idx" ON "hub_assets"("siteId");

-- AddForeignKey
ALTER TABLE "hub_assets" ADD CONSTRAINT "hub_assets_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
