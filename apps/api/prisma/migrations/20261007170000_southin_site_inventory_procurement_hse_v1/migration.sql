-- CreateEnum
CREATE TYPE "InventoryControlType" AS ENUM ('CONSUMABLE', 'NON_CONSUMABLE');

-- CreateEnum
CREATE TYPE "StoresAvailabilityStatus" AS ENUM ('PENDING_CHECK', 'IN_STOCK', 'PARTIALLY_AVAILABLE', 'NOT_IN_STOCK', 'ISSUED');

-- CreateEnum
CREATE TYPE "ProcurementRequestType" AS ENUM ('NON_CONSUMABLE', 'STOCK_REPLENISHMENT', 'DIRECT_PURCHASE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcurementOrigin" AS ENUM ('DIRECT', 'STORES_STOCKOUT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MedicalRecordType" AS ENUM ('PERIODIC', 'SILICOSIS', 'EXIT', 'RETURN_TO_WORK', 'CLINIC_OTHER');

-- CreateEnum
CREATE TYPE "MedicalFitnessStatus" AS ENUM ('FIT', 'FIT_WITH_RESTRICTIONS', 'NOT_FIT', 'PENDING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentKind" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_COST');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentFrequency" AS ENUM ('ONCE', 'RECURRING');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentStatus" AS ENUM ('DRAFT', 'APPROVED', 'APPLIED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ApprovalWorkflowType" ADD VALUE 'PROCUREMENT_REQUISITION';

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "siteGroupId" TEXT,
ADD COLUMN     "sourceDivisionName" TEXT;

-- AlterTable
ALTER TABLE "site_initiator_assignments" ADD COLUMN     "initiatorEmployeeId" TEXT,
ADD COLUMN     "initiatorEntraObjectId" TEXT,
ALTER COLUMN "initiatorRole" SET DEFAULT 'DATA_ENTRY_CLERK',
ALTER COLUMN "moduleScope" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "procurement_requests" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ZMW',
ADD COLUMN     "estimatedAmount" DECIMAL(18,2),
ADD COLUMN     "origin" "ProcurementOrigin" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "requestType" "ProcurementRequestType" NOT NULL DEFAULT 'NON_CONSUMABLE',
ADD COLUMN     "requiredBy" TIMESTAMP(3),
ADD COLUMN     "sourceRequestDate" TIMESTAMP(3),
ADD COLUMN     "sourceRequestFromEmail" TEXT,
ADD COLUMN     "sourceRequestFromName" TEXT,
ADD COLUMN     "sourceRequestReference" TEXT,
ADD COLUMN     "sourceStoresRequisitionId" TEXT,
ALTER COLUMN "department" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "hub_assets" ADD COLUMN     "goodsReceiptLineId" TEXT,
ADD COLUMN     "imei1" TEXT,
ADD COLUMN     "imei2" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "modelNumber" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT;

-- AlterTable
ALTER TABLE "stock_items" ADD COLUMN     "assetRegistrationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "custodyTrackingRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inventoryControlType" "InventoryControlType" NOT NULL DEFAULT 'CONSUMABLE';

-- AlterTable
ALTER TABLE "asset_custody_assignments" ADD COLUMN     "employeeId" TEXT;

-- AlterTable
ALTER TABLE "StoresRequisition" ADD COLUMN     "availabilityStatus" "StoresAvailabilityStatus" NOT NULL DEFAULT 'PENDING_CHECK',
ADD COLUMN     "requiredBy" TIMESTAMP(3),
ADD COLUMN     "sourceRequestDate" TIMESTAMP(3),
ADD COLUMN     "sourceRequestFromEmail" TEXT,
ADD COLUMN     "sourceRequestFromName" TEXT,
ADD COLUMN     "sourceRequestReference" TEXT;

-- CreateTable
CREATE TABLE "site_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "town" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_group_manager_assignments" (
    "id" TEXT NOT NULL,
    "siteGroupId" TEXT NOT NULL,
    "managerEmployeeId" TEXT,
    "managerName" TEXT NOT NULL,
    "managerEmail" TEXT,
    "managerRole" TEXT NOT NULL DEFAULT 'SITE_MANAGER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_group_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMedicalCompliance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodicMedicalDate" TIMESTAMP(3),
    "periodicMedicalDueDate" TIMESTAMP(3),
    "exitMedicalDate" TIMESTAMP(3),
    "returnToWorkMedicalDate" TIMESTAMP(3),
    "otherClinicMedicalDate" TIMESTAMP(3),
    "otherClinicMedicalType" TEXT,
    "otherClinicNotes" TEXT,
    "fitnessStatus" TEXT,
    "restrictionNotes" TEXT,
    "updatedBy" TEXT,
    "updatedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMedicalCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMedicalRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "medicalType" "MedicalRecordType" NOT NULL,
    "completedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "fitnessStatus" "MedicalFitnessStatus" NOT NULL DEFAULT 'UNKNOWN',
    "restrictions" TEXT,
    "site" TEXT,
    "provider" TEXT,
    "certificateNumber" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "sourceReference" TEXT,
    "createdBy" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayrollAdjustment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "kind" "PayrollAdjustmentKind" NOT NULL,
    "frequency" "PayrollAdjustmentFrequency" NOT NULL DEFAULT 'ONCE',
    "amount" DECIMAL(18,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "affectsNetPay" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "sourceReference" TEXT,
    "notes" TEXT,
    "approvalRequestId" TEXT,
    "status" "PayrollAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "createdByEmail" TEXT,
    "approvedBy" TEXT,
    "approvedByEmail" TEXT,
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAttachment" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "storageProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedByEmail" TEXT,
    "uploadedByEntraId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRequirementRule" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "minimumCount" INTEGER NOT NULL DEFAULT 1,
    "minimumAmount" DECIMAL(18,2),
    "maximumAmount" DECIMAL(18,2),
    "required" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceRequirementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementRequestLine" (
    "id" TEXT NOT NULL,
    "procurementRequestId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "specification" TEXT,
    "category" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "estimatedUnitCost" DECIMAL(18,2),
    "estimatedTotal" DECIMAL(18,2),
    "replacementAssetNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementRequestLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementQuotation" (
    "id" TEXT NOT NULL,
    "procurementRequestId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "quotationNo" TEXT,
    "quotationDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "amount" DECIMAL(18,2) NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "procurementRequestId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedBy" TEXT,
    "issuedByEmail" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "procurementRequestLineId" TEXT,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_groups_code_key" ON "site_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "site_groups_name_key" ON "site_groups"("name");

-- CreateIndex
CREATE INDEX "site_groups_town_idx" ON "site_groups"("town");

-- CreateIndex
CREATE INDEX "site_groups_isActive_idx" ON "site_groups"("isActive");

-- CreateIndex
CREATE INDEX "site_group_manager_assignments_siteGroupId_idx" ON "site_group_manager_assignments"("siteGroupId");

-- CreateIndex
CREATE INDEX "site_group_manager_assignments_managerEmployeeId_idx" ON "site_group_manager_assignments"("managerEmployeeId");

-- CreateIndex
CREATE INDEX "site_group_manager_assignments_managerEmail_idx" ON "site_group_manager_assignments"("managerEmail");

-- CreateIndex
CREATE INDEX "site_group_manager_assignments_isActive_idx" ON "site_group_manager_assignments"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeMedicalCompliance_employeeId_key" ON "EmployeeMedicalCompliance"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeMedicalCompliance_periodicMedicalDueDate_idx" ON "EmployeeMedicalCompliance"("periodicMedicalDueDate");

-- CreateIndex
CREATE INDEX "EmployeeMedicalCompliance_fitnessStatus_idx" ON "EmployeeMedicalCompliance"("fitnessStatus");

-- CreateIndex
CREATE INDEX "EmployeeMedicalRecord_employeeId_idx" ON "EmployeeMedicalRecord"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeMedicalRecord_medicalType_idx" ON "EmployeeMedicalRecord"("medicalType");

-- CreateIndex
CREATE INDEX "EmployeeMedicalRecord_expiryDate_idx" ON "EmployeeMedicalRecord"("expiryDate");

-- CreateIndex
CREATE INDEX "EmployeeMedicalRecord_fitnessStatus_idx" ON "EmployeeMedicalRecord"("fitnessStatus");

-- CreateIndex
CREATE INDEX "EmployeePayrollAdjustment_employeeId_idx" ON "EmployeePayrollAdjustment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePayrollAdjustment_componentCode_idx" ON "EmployeePayrollAdjustment"("componentCode");

-- CreateIndex
CREATE INDEX "EmployeePayrollAdjustment_status_idx" ON "EmployeePayrollAdjustment"("status");

-- CreateIndex
CREATE INDEX "EmployeePayrollAdjustment_effectiveFrom_idx" ON "EmployeePayrollAdjustment"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAttachment_storagePath_key" ON "DocumentAttachment"("storagePath");

-- CreateIndex
CREATE INDEX "DocumentAttachment_module_idx" ON "DocumentAttachment"("module");

-- CreateIndex
CREATE INDEX "DocumentAttachment_entityType_entityId_idx" ON "DocumentAttachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DocumentAttachment_category_idx" ON "DocumentAttachment"("category");

-- CreateIndex
CREATE INDEX "DocumentAttachment_status_idx" ON "DocumentAttachment"("status");

-- CreateIndex
CREATE INDEX "DocumentAttachment_uploadedAt_idx" ON "DocumentAttachment"("uploadedAt");

-- CreateIndex
CREATE INDEX "DocumentAttachment_expiresAt_idx" ON "DocumentAttachment"("expiresAt");

-- CreateIndex
CREATE INDEX "EvidenceRequirementRule_module_workflowType_idx" ON "EvidenceRequirementRule"("module", "workflowType");

-- CreateIndex
CREATE INDEX "EvidenceRequirementRule_category_idx" ON "EvidenceRequirementRule"("category");

-- CreateIndex
CREATE INDEX "EvidenceRequirementRule_isActive_idx" ON "EvidenceRequirementRule"("isActive");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_procurementRequestId_idx" ON "ProcurementRequestLine"("procurementRequestId");

-- CreateIndex
CREATE INDEX "ProcurementQuotation_procurementRequestId_idx" ON "ProcurementQuotation"("procurementRequestId");

-- CreateIndex
CREATE INDEX "ProcurementQuotation_supplierId_idx" ON "ProcurementQuotation"("supplierId");

-- CreateIndex
CREATE INDEX "ProcurementQuotation_isSelected_idx" ON "ProcurementQuotation"("isSelected");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_procurementRequestId_idx" ON "PurchaseOrder"("procurementRequestId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_issuedAt_idx" ON "PurchaseOrder"("issuedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "Site_siteGroupId_idx" ON "Site"("siteGroupId");

-- CreateIndex
CREATE INDEX "Site_isActive_idx" ON "Site"("isActive");

-- CreateIndex
CREATE INDEX "site_initiator_assignments_initiatorEmployeeId_idx" ON "site_initiator_assignments"("initiatorEmployeeId");

-- CreateIndex
CREATE INDEX "site_initiator_assignments_initiatorEntraObjectId_idx" ON "site_initiator_assignments"("initiatorEntraObjectId");

-- CreateIndex
CREATE INDEX "procurement_requests_requestType_idx" ON "procurement_requests"("requestType");

-- CreateIndex
CREATE INDEX "procurement_requests_origin_idx" ON "procurement_requests"("origin");

-- CreateIndex
CREATE INDEX "procurement_requests_sourceStoresRequisitionId_idx" ON "procurement_requests"("sourceStoresRequisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "hub_assets_imei1_key" ON "hub_assets"("imei1");

-- CreateIndex
CREATE UNIQUE INDEX "hub_assets_imei2_key" ON "hub_assets"("imei2");

-- CreateIndex
CREATE INDEX "stock_items_inventoryControlType_idx" ON "stock_items"("inventoryControlType");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_employeeId_idx" ON "asset_custody_assignments"("employeeId");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_employeeNumber_idx" ON "asset_custody_assignments"("employeeNumber");

-- CreateIndex
CREATE INDEX "StoresRequisition_availabilityStatus_idx" ON "StoresRequisition"("availabilityStatus");

-- AddForeignKey
ALTER TABLE "site_group_manager_assignments" ADD CONSTRAINT "site_group_manager_assignments_siteGroupId_fkey" FOREIGN KEY ("siteGroupId") REFERENCES "site_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_group_manager_assignments" ADD CONSTRAINT "site_group_manager_assignments_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_siteGroupId_fkey" FOREIGN KEY ("siteGroupId") REFERENCES "site_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_initiator_assignments" ADD CONSTRAINT "site_initiator_assignments_initiatorEmployeeId_fkey" FOREIGN KEY ("initiatorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMedicalCompliance" ADD CONSTRAINT "EmployeeMedicalCompliance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMedicalRecord" ADD CONSTRAINT "EmployeeMedicalRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollAdjustment" ADD CONSTRAINT "EmployeePayrollAdjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_sourceStoresRequisitionId_fkey" FOREIGN KEY ("sourceStoresRequisitionId") REFERENCES "StoresRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "procurement_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementQuotation" ADD CONSTRAINT "ProcurementQuotation_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "procurement_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementQuotation" ADD CONSTRAINT "ProcurementQuotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "procurement_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
