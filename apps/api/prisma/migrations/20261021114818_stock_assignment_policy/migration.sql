CREATE TYPE "StockAssignmentPolicy" AS ENUM (
  'NONE',
  'EMPLOYEE',
  'SITE',
  'DEPARTMENT',
  'PROJECT',
  'DEPLOYMENT',
  'FLEXIBLE'
);

ALTER TABLE "stock_items"
ADD COLUMN "assignmentPolicy"
"StockAssignmentPolicy"
NOT NULL DEFAULT 'NONE';

ALTER TABLE "asset_custody_assignments"
ADD COLUMN "quantity"
DECIMAL(18, 2)
NOT NULL DEFAULT 1;

ALTER TABLE "asset_custody_assignments"
ADD COLUMN "assignedToReferenceId" TEXT;

ALTER TABLE "asset_custody_assignments"
ADD COLUMN "stockMovementId" TEXT;

ALTER TABLE "asset_custody_assignments"
ADD COLUMN "stockMovementLineId" TEXT;

ALTER TABLE "asset_custody_assignments"
ADD COLUMN "storesRequisitionId" TEXT;

CREATE INDEX
"asset_custody_assignments_stockMovementId_idx"
ON "asset_custody_assignments"("stockMovementId");

CREATE INDEX
"asset_custody_assignments_stockMovementLineId_idx"
ON "asset_custody_assignments"("stockMovementLineId");

CREATE INDEX
"asset_custody_assignments_storesRequisitionId_idx"
ON "asset_custody_assignments"("storesRequisitionId");

CREATE INDEX
"asset_custody_assignments_assignedToReferenceId_idx"
ON "asset_custody_assignments"("assignedToReferenceId");


-- Existing consumables never require an assignment target.
UPDATE "stock_items"
SET "assignmentPolicy" = 'NONE'
WHERE "inventoryControlType" = 'CONSUMABLE';


-- Existing non-consumables are deliberately marked FLEXIBLE
-- until their final assignment policy is reviewed.
UPDATE "stock_items"
SET "assignmentPolicy" = 'FLEXIBLE'
WHERE "inventoryControlType" = 'NON_CONSUMABLE';


-- Scaffold components follow the deployment workflow.
UPDATE "stock_items"
SET "assignmentPolicy" = 'DEPLOYMENT'
WHERE
  "inventoryControlType" = 'NON_CONSUMABLE'
  AND "itemType" = 'SCAFFOLD_COMPONENT';


-- Known Allen Key sets are employee-custody tools.
UPDATE "stock_items"
SET
  "assignmentPolicy" = 'EMPLOYEE',
  "custodyTrackingRequired" = true
WHERE
  upper("itemName") LIKE '%ALLEN KEY%';
