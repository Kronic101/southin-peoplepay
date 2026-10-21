-- CreateIndex
CREATE INDEX "asset_custody_assignments_assignedToType_idx" ON "asset_custody_assignments"("assignedToType");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_assignedToType_assignedToReferenc_idx" ON "asset_custody_assignments"("assignedToType", "assignedToReferenceId");

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_stockMovementLineId_fkey" FOREIGN KEY ("stockMovementLineId") REFERENCES "stock_movement_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_storesRequisitionId_fkey" FOREIGN KEY ("storesRequisitionId") REFERENCES "StoresRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
