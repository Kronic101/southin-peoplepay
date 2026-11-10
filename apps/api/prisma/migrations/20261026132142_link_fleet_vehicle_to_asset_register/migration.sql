/*
  Warnings:

  - A unique constraint covering the columns `[assetId]` on the table `fleet_vehicles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "fleet_vehicles_assetId_key" ON "fleet_vehicles"("assetId");

-- AddForeignKey
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hub_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
