-- CreateEnum
CREATE TYPE "PayBasis" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY');

-- CreateEnum
CREATE TYPE "FleetVehicleStatus" AS ENUM ('ACTIVE', 'ASSIGNED', 'IN_WORKSHOP', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetImportBatchStatus" AS ENUM ('DRAFT', 'VALIDATED', 'POSTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetImportLineStatus" AS ENUM ('VALID', 'WARNING', 'ERROR', 'POSTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FinanceReportType" AS ENUM ('SUMMARY', 'DEPARTMENT_COSTS', 'SITE_COSTS', 'OUTSTANDING_PAYMENTS', 'APPROVAL_STATUS', 'EXPENSE_EXPORT', 'PROCUREMENT_EXPORT', 'EVIDENCE_EXPORT', 'PAYMENT_BATCH_EXPORT');

-- CreateEnum
CREATE TYPE "FinanceExportFormat" AS ENUM ('JSON', 'CSV', 'PDF', 'EXCEL');

-- CreateEnum
CREATE TYPE "FinanceReportExportStatus" AS ENUM ('GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "StockItemType" AS ENUM ('CONSUMABLE', 'TOOL', 'PPE', 'SCAFFOLD_COMPONENT', 'SPARE_PART', 'FUEL', 'MATERIAL', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'LOSS', 'DAMAGE', 'WRITE_OFF', 'WORKSHOP_ISSUE', 'SCAFFOLD_ISSUE', 'SCAFFOLD_RETURN');

-- CreateEnum
CREATE TYPE "StockMovementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED', 'IN_REVIEW');

-- CreateEnum
CREATE TYPE "ScaffoldComponentType" AS ENUM ('STANDARD', 'LEDGER', 'TRANSOM', 'BASE_JACK', 'TOE_BOARD', 'PLATFORM', 'COUPLER', 'LADDER', 'GUARD_RAIL', 'BRACE', 'OTHER');

-- CreateEnum
CREATE TYPE "ScaffoldTagStatus" AS ENUM ('AVAILABLE', 'ISSUED', 'IN_USE', 'DAMAGED', 'LOST', 'RETIRED');

-- CreateEnum
CREATE TYPE "WorkshopJobStatus" AS ENUM ('OPEN', 'DIAGNOSIS', 'AWAITING_PARTS', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'RELEASED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkshopJobPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WorkshopJobType" AS ENUM ('SERVICE', 'REPAIR', 'INSPECTION', 'DEFECT_REPAIR', 'BREAKDOWN', 'PREVENTIVE_MAINTENANCE', 'ACCIDENT_REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityRecordStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SafetyIncidentStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FleetInspectionStatus" AS ENUM ('PASSED', 'FAILED', 'DEFECT_REPORTED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_USE', 'IN_STORE', 'UNDER_REPAIR', 'LOST', 'DAMAGED', 'RETIRED', 'DISPOSED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('EQUIPMENT', 'TOOL', 'VEHICLE', 'SCAFFOLD', 'CONSUMABLE', 'IT_EQUIPMENT', 'PPE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcurementRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PO_ISSUED', 'GOODS_RECEIVED', 'INVOICE_RECEIVED', 'PAYMENT_REVIEW', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "HubDocumentStatus" AS ENUM ('DRAFT', 'UPLOADED', 'APPROVED', 'REJECTED', 'PUBLISHED_TO_SHAREPOINT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HubDocumentConfidentiality" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL_HR', 'CONFIDENTIAL_FINANCE', 'CONFIDENTIAL_OPERATIONS', 'CONFIDENTIAL_EXECUTIVE');

-- CreateEnum
CREATE TYPE "FinanceExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'READY_FOR_PAYMENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceEvidenceStatus" AS ENUM ('REQUIRED', 'UPLOADED', 'APPROVED', 'READY_FOR_SHAREPOINT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "OperationsModule" AS ENUM ('HR', 'PAYROLL', 'FINANCE', 'PROCUREMENT', 'ASSET_MANAGEMENT', 'FLEET', 'STORES', 'SAFETY', 'QUALITY_ADMIN', 'OPERATIONS', 'SHAREPOINT', 'SYSTEM_ADMIN', 'PEOPLE_OPERATIONS');

-- CreateEnum
CREATE TYPE "ApprovalWorkflowType" AS ENUM ('LEAVE_REQUEST', 'EXPENSE_REQUEST', 'PROCUREMENT_REQUEST', 'ASSET_PURCHASE', 'ASSET_MOVEMENT', 'FLEET_REQUEST', 'SAFETY_INCIDENT', 'STORES_REQUISITION', 'PAYROLL_RUN', 'PAYMENT_BATCH', 'SHAREPOINT_PUBLISH', 'GENERAL_REQUEST', 'ASSET_CUSTODY', 'STOCK_COUNT', 'SCAFFOLD_DEPLOYMENT', 'SCAFFOLD_INSPECTION', 'WORKSHOP_PARTS_ISSUE', 'FLEET_COST', 'FLEET_DEFECT', 'FLEET_TRIP', 'FLEET_FUEL', 'PEOPLE_ATTENDANCE_REVIEW', 'TIMESHEET_APPROVAL', 'OVERTIME_REQUEST', 'SAFETY_OBSERVATION_REVIEW', 'SAFETY_CORRECTIVE_ACTION_CLOSEOUT');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApprovalDecisionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApprovalStepRole" AS ENUM ('REQUESTER', 'SUPERVISOR', 'LINE_MANAGER', 'FOREMAN', 'BRANCH_MANAGER', 'HOD', 'HR_MANAGER', 'FINANCE_MANAGER', 'PROCUREMENT_OFFICER', 'ASSET_MANAGER', 'OPERATIONS_MANAGER', 'QUALITY_ADMIN_MANAGER', 'SAFETY_OFFICER', 'DIRECTOR_FINANCE', 'DIRECTOR_OPERATIONS', 'DIRECTOR', 'ADMIN', 'PAYROLL_OFFICER', 'STORES_OFFICER', 'FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER', 'WORKSHOP_MANAGER', 'SITE_MANAGER', 'ADMINISTRATION_MANAGER', 'HR_OFFICER');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING_SUPERVISOR', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'COMPASSIONATE', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_PROBATION', 'SUSPENDED', 'ON_LEAVE', 'CONTRACT_EXPIRING', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('OPEN', 'PROCESSING', 'SUBMITTED_HR_REVIEW', 'HR_REVIEWED', 'SUBMITTED_FINANCE_REVIEW', 'FINANCE_REVIEWED', 'SUBMITTED_DIRECTOR_APPROVAL', 'DIRECTOR_APPROVED', 'LOCKED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollRunType" AS ENUM ('MONTHLY', 'WEEKLY', 'CASUAL', 'OFF_CYCLE', 'FINAL_PAY', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SharePointExportStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'DISABLED_DEV_MODE');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "microsoftUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTitle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_initiator_assignments" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "initiatorName" TEXT NOT NULL,
    "initiatorEmail" TEXT,
    "initiatorRole" TEXT NOT NULL DEFAULT 'SITE_INITIATOR',
    "moduleScope" JSONB NOT NULL DEFAULT '["STORES", "PROCUREMENT", "ASSETS"]',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_initiator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nrcNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "departmentId" TEXT,
    "jobTitleId" TEXT,
    "siteId" TEXT,
    "employmentTypeId" TEXT,
    "supervisorId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBranch" TEXT,
    "bankDetailsNotes" TEXT,
    "bankDetailsReviewedAt" TIMESTAMP(3),
    "bankDetailsReviewedBy" TEXT,
    "bankDetailsStatus" TEXT DEFAULT 'PENDING_VALIDATION',
    "bankName" TEXT,
    "bankSortCode" TEXT,
    "dailyRate" DECIMAL(18,2),
    "hourlyRate" DECIMAL(18,2),
    "monthlyRate" DECIMAL(18,2),
    "payBasis" "PayBasis",
    "rateEffectiveFrom" TIMESTAMP(3),
    "siteName" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePortalAccount" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "mustChangePin" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessProfile" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "allowedModules" JSONB,

    CONSTRAINT "EmployeePortalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeStatutoryDetails" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "tpin" TEXT,
    "napsaNumber" TEXT,
    "nhimaNumber" TEXT,
    "payeApplicable" BOOLEAN NOT NULL DEFAULT true,
    "napsaApplicable" BOOLEAN NOT NULL DEFAULT true,
    "nhimaApplicable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeStatutoryDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBankAccount" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBankAuditLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "changedBy" TEXT NOT NULL,
    "notes" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeBankAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeContract" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractTypeId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "probationEnd" TIMESTAMP(3),
    "noticePeriod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractNumber" TEXT,

    CONSTRAINT "EmployeeContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceConditionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "employmentTypeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceConditionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceConditionComponent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "calculationMethod" TEXT NOT NULL,
    "amount" DECIMAL(14,2),
    "percentage" DECIMAL(8,4),
    "frequency" TEXT,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "napsaPensionable" BOOLEAN NOT NULL DEFAULT false,
    "nhimaApplicable" BOOLEAN NOT NULL DEFAULT false,
    "includedInGross" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceConditionComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeServiceCondition" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "assignedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeServiceCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "attendanceNo" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "employeeName" TEXT,
    "siteId" TEXT,
    "siteName" TEXT,
    "siteManagerName" TEXT,
    "siteManagerEmail" TEXT,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "shift" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CAPTURED',
    "notes" TEXT,
    "capturedBy" TEXT,
    "capturedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalRequestId" TEXT,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_records" (
    "id" TEXT NOT NULL,
    "timesheetNo" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "employeeName" TEXT,
    "siteId" TEXT,
    "siteName" TEXT,
    "siteManagerName" TEXT,
    "siteManagerEmail" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "normalHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,
    "submittedBy" TEXT,
    "submittedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalRequestId" TEXT,

    CONSTRAINT "timesheet_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_requests" (
    "id" TEXT NOT NULL,
    "overtimeNo" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "employeeName" TEXT,
    "siteId" TEXT,
    "siteName" TEXT,
    "siteManagerName" TEXT,
    "siteManagerEmail" TEXT,
    "overtimeDate" TIMESTAMP(3) NOT NULL,
    "requestedHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hourlyRate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedBy" TEXT,
    "submittedByEmail" TEXT,
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_observations" (
    "id" TEXT NOT NULL,
    "observationNo" TEXT NOT NULL,
    "siteId" TEXT,
    "siteName" TEXT,
    "branch" TEXT,
    "department" TEXT,
    "exactLocation" TEXT,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "observationType" TEXT NOT NULL DEFAULT 'UNSAFE_CONDITION',
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "immediateAction" TEXT,
    "personObserved" TEXT,
    "employeeId" TEXT,
    "contractorName" TEXT,
    "reportedBy" TEXT,
    "reportedByEmail" TEXT,
    "photoUrls" JSONB,
    "gpsLatitude" DECIMAL(10,7),
    "gpsLongitude" DECIMAL(10,7),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "approvalRequestId" TEXT,
    "mobileDraftId" TEXT,
    "idempotencyKey" TEXT,
    "syncStatus" TEXT DEFAULT 'SYNCED',
    "deviceId" TEXT,
    "capturedOfflineAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_incidents" (
    "id" TEXT NOT NULL,
    "incidentNo" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "reportedBy" TEXT,
    "department" TEXT,
    "incidentType" TEXT NOT NULL DEFAULT 'NEAR_MISS',
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bodyPart" TEXT,
    "branch" TEXT,
    "capturedOfflineAt" TIMESTAMP(3),
    "contractorCompany" TEXT,
    "deviceId" TEXT,
    "exactLocation" TEXT,
    "gpsLatitude" DECIMAL(10,7),
    "gpsLongitude" DECIMAL(10,7),
    "idempotencyKey" TEXT,
    "immediateAction" TEXT,
    "injuredEmployeeId" TEXT,
    "injuredPersonName" TEXT,
    "injuryType" TEXT,
    "investigationNotes" TEXT,
    "mobileDraftId" TEXT,
    "photoUrls" JSONB,
    "reportedByEmail" TEXT,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rootCause" TEXT,
    "siteId" TEXT,
    "siteName" TEXT,
    "syncStatus" TEXT DEFAULT 'SYNCED',
    "syncedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',

    CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_corrective_actions" (
    "id" TEXT NOT NULL,
    "actionNo" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "observationId" TEXT,
    "incidentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedToName" TEXT,
    "assignedToEmail" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closeoutNotes" TEXT,

    CONSTRAINT "safety_corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "periodName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "runName" TEXT NOT NULL,
    "runType" "PayrollRunType" NOT NULL DEFAULT 'MONTHLY',
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'OPEN',
    "preparedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "hrReviewedBy" TEXT,
    "financeReviewedBy" TEXT,
    "directorApprovedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunEmployee" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employerCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "calculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRunEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEarning" (
    "id" TEXT NOT NULL,
    "payrollRunEmployeeId" TEXT NOT NULL,
    "earningType" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "napsaPensionable" BOOLEAN NOT NULL DEFAULT false,
    "nhimaApplicable" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollDeduction" (
    "id" TEXT NOT NULL,
    "payrollRunEmployeeId" TEXT NOT NULL,
    "deductionType" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollApproval" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "approvalStage" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "approverId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentBatch" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalNetPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "preparedBy" TEXT,
    "preparedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "evidenceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentBatchItem" (
    "id" TEXT NOT NULL,
    "paymentBatchId" TEXT NOT NULL,
    "payrollRunEmployeeId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "department" TEXT,
    "netPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "bankAccountNumber" TEXT,
    "bankDetailsStatus" TEXT NOT NULL DEFAULT 'PENDING_VALIDATION',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "validationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankAccountName" TEXT,

    CONSTRAINT "PaymentBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollRunEmployeeId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employerCost" DECIMAL(14,2) NOT NULL,
    "grossPay" DECIMAL(14,2) NOT NULL,
    "netPay" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "totalDeductions" DECIMAL(14,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayeBand" (
    "id" TEXT NOT NULL,
    "taxYearId" TEXT NOT NULL,
    "lowerBound" DECIMAL(14,2) NOT NULL,
    "upperBound" DECIMAL(14,2),
    "rate" DECIMAL(8,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayeBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NapsaRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeRate" DECIMAL(8,4) NOT NULL,
    "employerRate" DECIMAL(8,4) NOT NULL,
    "monthlyCeiling" DECIMAL(14,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NapsaRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NhimaRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeRate" DECIMAL(8,4) NOT NULL,
    "employerRate" DECIMAL(8,4) NOT NULL,
    "calculationBase" TEXT NOT NULL DEFAULT 'CONFIGURABLE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhimaRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SdlRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employerRate" DECIMAL(8,4) NOT NULL,
    "calculationBase" TEXT NOT NULL DEFAULT 'GROSS_EMOLUMENTS',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SdlRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_audit_logs" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedToSharePoint" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharePointPublishLog" (
    "id" TEXT NOT NULL,
    "publishType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetPath" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharePointPublishLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharePointExportLog" (
    "id" TEXT NOT NULL,
    "targetSite" TEXT NOT NULL,
    "targetPage" TEXT,
    "targetLibrary" TEXT,
    "payloadEndpoint" TEXT NOT NULL,
    "payloadType" TEXT,
    "confidentiality" TEXT,
    "requestedBy" TEXT,
    "graphEnabled" BOOLEAN NOT NULL DEFAULT false,
    "graphStatus" "SharePointExportStatus" NOT NULL DEFAULT 'DISABLED_DEV_MODE',
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharePointExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "supervisorName" TEXT,
    "supervisorEmail" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING_SUPERVISOR',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalRequestId" TEXT,
    "siteId" TEXT,
    "siteManagerEmail" TEXT,
    "siteManagerName" TEXT,
    "siteName" TEXT,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isStaffRole" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_positions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "positionCode" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "isHod" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT,
    "roleId" TEXT,
    "reportsToPositionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_matrix_rules" (
    "id" TEXT NOT NULL,
    "module" "OperationsModule" NOT NULL,
    "workflowType" "ApprovalWorkflowType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "minAmount" DECIMAL(18,2),
    "maxAmount" DECIMAL(18,2),
    "requiresFinance" BOOLEAN NOT NULL DEFAULT false,
    "requiresDirector" BOOLEAN NOT NULL DEFAULT false,
    "approvalSteps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_matrix_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "module" "OperationsModule" NOT NULL,
    "workflowType" "ApprovalWorkflowType" NOT NULL,
    "requestTitle" TEXT NOT NULL,
    "requestReference" TEXT,
    "requestDescription" TEXT,
    "requesterEmployeeId" TEXT,
    "requesterName" TEXT,
    "requesterRole" TEXT,
    "requesterDepartment" TEXT,
    "requesterSite" TEXT,
    "amount" DECIMAL(18,2),
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "approvalMatrixRuleId" TEXT,
    "payload" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requesterEmail" TEXT,
    "requesterEntraId" TEXT,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalApproverAssignment" (
    "id" TEXT NOT NULL,
    "module" TEXT,
    "workflowType" "ApprovalWorkflowType",
    "approvalRole" "ApprovalStepRole" NOT NULL,
    "site" TEXT,
    "branch" TEXT,
    "departmentId" TEXT,
    "assigneeType" TEXT NOT NULL DEFAULT 'USER',
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "microsoftUserId" TEXT,
    "entraGroupId" TEXT,
    "entraGroupName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalApproverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" TEXT NOT NULL,
    "approvalRole" "ApprovalStepRole",
    "module" TEXT,
    "workflowType" "ApprovalWorkflowType",
    "site" TEXT,
    "branch" TEXT,
    "departmentId" TEXT,
    "fromUserEmail" TEXT NOT NULL,
    "fromUserName" TEXT,
    "fromMicrosoftUserId" TEXT,
    "toUserEmail" TEXT NOT NULL,
    "toUserName" TEXT,
    "toMicrosoftUserId" TEXT,
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decisions" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "ApprovalStepRole" NOT NULL,
    "approverEmployeeId" TEXT,
    "approverName" TEXT,
    "approverEmail" TEXT,
    "status" "ApprovalDecisionStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actionedBy" TEXT,
    "actionedByEmail" TEXT,
    "actionedByEntraId" TEXT,
    "actionedByRole" TEXT,
    "approverEntraObjectId" TEXT,
    "approverRole" TEXT,

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_notification_queue" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT,
    "approvalDecisionId" TEXT,
    "module" TEXT,
    "workflowType" TEXT,
    "approvalRole" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "actionUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_report_export_logs" (
    "id" TEXT NOT NULL,
    "reportType" "FinanceReportType" NOT NULL,
    "exportFormat" "FinanceExportFormat" NOT NULL DEFAULT 'JSON',
    "status" "FinanceReportExportStatus" NOT NULL DEFAULT 'GENERATED',
    "requestedBy" TEXT,
    "requestedByEmail" TEXT,
    "filterPayload" JSONB,
    "resultSummary" JSONB,
    "fileName" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_report_export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_expenses" (
    "id" TEXT NOT NULL,
    "expenseNo" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "department" TEXT,
    "site" TEXT,
    "payee" TEXT,
    "requestedBy" TEXT,
    "requestedByEmail" TEXT,
    "status" "FinanceExpenseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "evidenceStatus" "FinanceEvidenceStatus" NOT NULL DEFAULT 'REQUIRED',
    "approvalRequestId" TEXT,
    "paidBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "financeComment" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_payment_evidence" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT,
    "paymentBatchId" TEXT,
    "procurementId" TEXT,
    "evidenceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUIRED',
    "documentId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_payment_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_documents" (
    "id" TEXT NOT NULL,
    "module" "OperationsModule" NOT NULL,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL_DEV',
    "storagePath" TEXT,
    "sharePointUrl" TEXT,
    "status" "HubDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "confidentiality" "HubDocumentConfidentiality" NOT NULL DEFAULT 'INTERNAL',
    "uploadedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_requests" (
    "id" TEXT NOT NULL,
    "requisitionNo" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "site" TEXT,
    "requestedBy" TEXT,
    "supplierName" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "procurementStage" TEXT NOT NULL DEFAULT 'REQUISITION_SUBMITTED',
    "financeStage" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    "status" "ProcurementRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "invoiceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_PAID',
    "proofOfPaymentStatus" TEXT NOT NULL DEFAULT 'NOT_UPLOADED',
    "purchaseOrderNo" TEXT,
    "invoiceNo" TEXT,
    "goodsReceivedNote" TEXT,
    "approvalRequestId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "supplierId" TEXT,
    "requestedByEmail" TEXT,
    "requestedByEntraId" TEXT,
    "requestedByRole" TEXT,

    CONSTRAINT "procurement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_assets" (
    "id" TEXT NOT NULL,
    "assetNo" TEXT NOT NULL,
    "assetTag" TEXT,
    "category" "AssetCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "site" TEXT,
    "location" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseValue" DECIMAL(18,2),
    "currentValue" DECIMAL(18,2),
    "supplierName" TEXT,
    "procurementRequestId" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accumulatedDepreciation" DECIMAL(18,2),
    "currentBookValue" DECIMAL(18,2),
    "depreciationMethod" TEXT,
    "monthlyDepreciationRate" DECIMAL(8,4),
    "purchaseCurrency" TEXT,
    "supplierId" TEXT,

    CONSTRAINT "hub_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_asset_movements" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_asset_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_asset_inspections" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectedBy" TEXT,
    "conditionStatus" TEXT NOT NULL,
    "findings" TEXT,
    "correctiveAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_asset_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_vehicles" (
    "id" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "assetId" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "vehicleType" TEXT NOT NULL,
    "department" TEXT,
    "site" TEXT,
    "odometerCurrent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "FleetVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "insuranceExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "roadTaxExpiry" TIMESTAMP(3),
    "telematicsProvider" TEXT,
    "telematicsUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_driver_profiles" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeNumber" TEXT,
    "driverName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "licenceNo" TEXT,
    "licenceClass" TEXT,
    "licenceExpiry" TIMESTAMP(3),
    "department" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_vehicle_assignments" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedBy" TEXT,
    "returnedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_due_items" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "dueType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "dueOdometer" DECIMAL(18,2),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_due_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_documents" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentNo" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "fileName" TEXT,
    "storagePath" TEXT,
    "sharePointUrl" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_notifications" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "notificationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "sentTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_inspections" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeNumber" TEXT,
    "driverName" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odometer" DECIMAL(18,2) NOT NULL,
    "checklistPhase" TEXT NOT NULL,
    "overallStatus" "FleetInspectionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT,

    CONSTRAINT "fleet_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_defects" (
    "id" TEXT NOT NULL,
    "defectNo" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reportedBy" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_trips" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverEmployeeId" TEXT,
    "driverName" TEXT,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "openingOdometer" DECIMAL(18,2) NOT NULL,
    "closingOdometer" DECIMAL(18,2),
    "distanceKm" DECIMAL(18,2),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT,

    CONSTRAINT "fleet_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_fuel_logs" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fuelDate" TIMESTAMP(3) NOT NULL,
    "stationName" TEXT NOT NULL,
    "litres" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "odometer" DECIMAL(18,2) NOT NULL,
    "receiptDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT,

    CONSTRAINT "fleet_fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_cost_postings" (
    "id" TEXT NOT NULL,
    "costNo" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleRegistration" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "costDate" TIMESTAMP(3) NOT NULL,
    "month" TEXT,
    "department" TEXT,
    "site" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_FINANCE_REVIEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3),
    "financeExpenseId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_cost_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_records" (
    "id" TEXT NOT NULL,
    "recordNo" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "department" TEXT,
    "site" TEXT,
    "raisedBy" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "QualityRecordStatus" NOT NULL DEFAULT 'OPEN',
    "correctiveAction" TEXT,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "supplierCode" TEXT,
    "supplierName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "taxNumber" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemType" "StockItemType" NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "minimumLevel" DECIMAL(18,2),
    "reorderLevel" DECIMAL(18,2),
    "standardCost" DECIMAL(18,2),
    "isSerialized" BOOLEAN NOT NULL DEFAULT false,
    "isQrTracked" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isRfidTracked" BOOLEAN NOT NULL DEFAULT false,
    "legacyCode" TEXT,
    "legacySource" TEXT,
    "poNumber" TEXT,
    "supplierCode" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "locationType" TEXT NOT NULL DEFAULT 'SITE_STORE',
    "site" TEXT,
    "branch" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantityIssued" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantityDamaged" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantityLost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_sessions" (
    "id" TEXT NOT NULL,
    "countNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locationId" TEXT,
    "locationName" TEXT,
    "department" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation_history" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "depreciationAmount" DECIMAL(18,2) NOT NULL,
    "accumulatedDepreciation" DECIMAL(18,2) NOT NULL,
    "bookValue" DECIMAL(18,2) NOT NULL,
    "calculatedBy" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetApprovalHistory" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL DEFAULT 'ASSET_MOVEMENT',
    "approvalLevel" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "approverName" TEXT NOT NULL,
    "approverRole" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "movementNo" TEXT NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "status" "StockMovementStatus" NOT NULL DEFAULT 'DRAFT',
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "requestedBy" TEXT,
    "requestedByEmail" TEXT,
    "department" TEXT,
    "site" TEXT,
    "projectCode" TEXT,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "approvalRequestId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalPath" TEXT,
    "approvalStatus" TEXT,
    "branch" TEXT,
    "currentApprovalStep" INTEGER DEFAULT 0,
    "financeExpenseId" TEXT,
    "procurementRequestId" TEXT,
    "referenceNo" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "workshopJobId" TEXT,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement_lines" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,2),
    "totalCost" DECIMAL(18,2),
    "qrTagId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledger" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "movementId" TEXT,
    "movementLineId" TEXT,
    "financeExpenseId" TEXT,
    "procurementRequestId" TEXT,
    "workshopJobId" TEXT,
    "transactionType" TEXT NOT NULL,
    "quantityIn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantityOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(18,2),
    "totalCost" DECIMAL(18,2),
    "referenceType" TEXT,
    "referenceId" TEXT,
    "referenceNo" TEXT,
    "department" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "projectCode" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_lines" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "locationId" TEXT,
    "systemQuantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "countedQuantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "varianceReason" TEXT,
    "adjustmentPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_custody_assignments" (
    "id" TEXT NOT NULL,
    "assignmentNo" TEXT NOT NULL,
    "assetId" TEXT,
    "stockItemId" TEXT,
    "qrTagId" TEXT,
    "locationId" TEXT,
    "financeExpenseId" TEXT,
    "assignedToType" TEXT NOT NULL,
    "assignedToName" TEXT NOT NULL,
    "assignedToEmail" TEXT,
    "employeeNumber" TEXT,
    "department" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnAt" TIMESTAMP(3),
    "returnedBy" TEXT,
    "returnedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "conditionOut" TEXT,
    "conditionIn" TEXT,
    "notes" TEXT,
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_custody_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scaffold_deployments" (
    "id" TEXT NOT NULL,
    "deploymentNo" TEXT NOT NULL,
    "scaffoldComponentId" TEXT,
    "stockItemId" TEXT,
    "qrTagId" TEXT,
    "movementId" TEXT,
    "issuedToLocationId" TEXT,
    "financeExpenseId" TEXT,
    "issuedToSite" TEXT NOT NULL,
    "issuedToPerson" TEXT,
    "issuedBy" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnedBy" TEXT,
    "conditionOut" TEXT,
    "conditionIn" TEXT,
    "returnNotes" TEXT,
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scaffold_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scaffold_inspections" (
    "id" TEXT NOT NULL,
    "scaffoldComponentId" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectedBy" TEXT,
    "conditionStatus" TEXT,
    "findings" TEXT,
    "actionRequired" TEXT,
    "isSafeForUse" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalRequestId" TEXT,
    "correctiveAction" TEXT,
    "defectNotes" TEXT,
    "defectsFound" BOOLEAN NOT NULL DEFAULT false,
    "evidenceDocumentId" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectionNo" TEXT,
    "inspectionStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "inspectionType" TEXT NOT NULL DEFAULT 'GENERAL',
    "location" TEXT,
    "nextInspectionDate" TIMESTAMP(3),
    "qrTagId" TEXT,
    "site" TEXT,

    CONSTRAINT "scaffold_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_qr_tags" (
    "id" TEXT NOT NULL,
    "tagCode" TEXT NOT NULL,
    "qrPayload" TEXT,
    "barcodeValue" TEXT,
    "stockItemId" TEXT,
    "assetId" TEXT,
    "scaffoldComponentId" TEXT,
    "assignedLocationId" TEXT,
    "status" "ScaffoldTagStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lastScannedAt" TIMESTAMP(3),
    "lastScannedBy" TEXT,
    "lastScanSite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_qr_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scaffold_components" (
    "id" TEXT NOT NULL,
    "componentNo" TEXT NOT NULL,
    "componentType" "ScaffoldComponentType" NOT NULL,
    "description" TEXT,
    "stockItemId" TEXT,
    "currentSite" TEXT,
    "currentLocation" TEXT,
    "conditionStatus" TEXT NOT NULL DEFAULT 'GOOD',
    "tagStatus" "ScaffoldTagStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchaseDate" TIMESTAMP(3),
    "purchaseValue" DECIMAL(18,2),
    "lastInspectionDate" TIMESTAMP(3),
    "nextInspectionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scaffold_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_workshop_jobs" (
    "id" TEXT NOT NULL,
    "jobCardNo" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "defectId" TEXT,
    "jobType" "WorkshopJobType" NOT NULL,
    "priority" "WorkshopJobPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "WorkshopJobStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "diagnosis" TEXT,
    "workDone" TEXT,
    "openedBy" TEXT,
    "assignedTo" TEXT,
    "approvedBy" TEXT,
    "releasedBy" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "odometerIn" DECIMAL(18,2),
    "odometerOut" DECIMAL(18,2),
    "labourCost" DECIMAL(18,2),
    "partsCost" DECIMAL(18,2),
    "totalCost" DECIMAL(18,2),
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_workshop_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_workshop_parts" (
    "id" TEXT NOT NULL,
    "workshopJobId" TEXT NOT NULL,
    "stockItemId" TEXT,
    "partName" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,2),
    "totalCost" DECIMAL(18,2),
    "issuedMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_workshop_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_workshop_labour" (
    "id" TEXT NOT NULL,
    "workshopJobId" TEXT NOT NULL,
    "technicianName" TEXT NOT NULL,
    "labourHours" DECIMAL(18,2) NOT NULL,
    "hourlyRate" DECIMAL(18,2),
    "labourCost" DECIMAL(18,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_workshop_labour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetImportBatch" (
    "id" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "fileName" TEXT,
    "status" "AssetImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "postedRows" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3),
    "notes" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetImportLine" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT,
    "itemType" TEXT,
    "category" TEXT,
    "unitOfMeasure" TEXT,
    "locationCode" TEXT,
    "locationName" TEXT,
    "locationType" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "department" TEXT,
    "quantityOnHand" DECIMAL(18,2),
    "minimumLevel" DECIMAL(18,2),
    "reorderLevel" DECIMAL(18,2),
    "standardCost" DECIMAL(18,2),
    "scaffoldComponentNo" TEXT,
    "componentType" TEXT,
    "conditionStatus" TEXT,
    "tagStatus" TEXT,
    "qrTagCode" TEXT,
    "status" "AssetImportLineStatus" NOT NULL DEFAULT 'VALID',
    "validationErrors" JSONB,
    "rawPayload" JSONB,
    "postedStockItemId" TEXT,
    "postedLocationId" TEXT,
    "postedBalanceId" TEXT,
    "postedMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyCode" TEXT,
    "legacyPayload" JSONB,
    "legacyRecordId" TEXT,
    "legacySourceTable" TEXT,

    CONSTRAINT "AssetImportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoresRequisition" (
    "id" TEXT NOT NULL,
    "requisitionNo" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "reason" TEXT,
    "requestedBy" TEXT,
    "requestedByEmail" TEXT,
    "requesterRole" TEXT,
    "department" TEXT,
    "departmentId" TEXT,
    "site" TEXT,
    "branch" TEXT,
    "projectCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "approvalRequestId" TEXT,
    "totalValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoresRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoresRequisitionLine" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "stockItemId" TEXT,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoresRequisitionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_sites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_manager_assignments" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "managerRole" TEXT DEFAULT 'SITE_MANAGER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operationalSiteId" TEXT,

    CONSTRAINT "site_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_microsoftUserId_key" ON "User"("microsoftUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_name_key" ON "JobTitle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE INDEX "site_initiator_assignments_siteId_idx" ON "site_initiator_assignments"("siteId");

-- CreateIndex
CREATE INDEX "site_initiator_assignments_initiatorEmail_idx" ON "site_initiator_assignments"("initiatorEmail");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentType_name_key" ON "EmploymentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePortalAccount_employeeId_key" ON "EmployeePortalAccount"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePortalAccount_employeeNumber_key" ON "EmployeePortalAccount"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeStatutoryDetails_employeeId_key" ON "EmployeeStatutoryDetails"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeBankAuditLog_employeeId_idx" ON "EmployeeBankAuditLog"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeBankAuditLog_bankAccountId_idx" ON "EmployeeBankAuditLog"("bankAccountId");

-- CreateIndex
CREATE INDEX "EmployeeBankAuditLog_action_idx" ON "EmployeeBankAuditLog"("action");

-- CreateIndex
CREATE INDEX "EmployeeBankAuditLog_createdAt_idx" ON "EmployeeBankAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractType_name_key" ON "ContractType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeContract_contractNumber_key" ON "EmployeeContract"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceConditionTemplate_name_key" ON "ServiceConditionTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_attendanceNo_key" ON "attendance_records"("attendanceNo");

-- CreateIndex
CREATE INDEX "attendance_records_employeeId_idx" ON "attendance_records"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_records_siteId_idx" ON "attendance_records"("siteId");

-- CreateIndex
CREATE INDEX "attendance_records_siteManagerEmail_idx" ON "attendance_records"("siteManagerEmail");

-- CreateIndex
CREATE INDEX "attendance_records_attendanceDate_idx" ON "attendance_records"("attendanceDate");

-- CreateIndex
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");

-- CreateIndex
CREATE INDEX "attendance_records_approvalRequestId_idx" ON "attendance_records"("approvalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_records_timesheetNo_key" ON "timesheet_records"("timesheetNo");

-- CreateIndex
CREATE INDEX "timesheet_records_employeeId_idx" ON "timesheet_records"("employeeId");

-- CreateIndex
CREATE INDEX "timesheet_records_siteId_idx" ON "timesheet_records"("siteId");

-- CreateIndex
CREATE INDEX "timesheet_records_siteManagerEmail_idx" ON "timesheet_records"("siteManagerEmail");

-- CreateIndex
CREATE INDEX "timesheet_records_status_idx" ON "timesheet_records"("status");

-- CreateIndex
CREATE INDEX "timesheet_records_approvalRequestId_idx" ON "timesheet_records"("approvalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_requests_overtimeNo_key" ON "overtime_requests"("overtimeNo");

-- CreateIndex
CREATE INDEX "overtime_requests_employeeId_idx" ON "overtime_requests"("employeeId");

-- CreateIndex
CREATE INDEX "overtime_requests_siteId_idx" ON "overtime_requests"("siteId");

-- CreateIndex
CREATE INDEX "overtime_requests_siteManagerEmail_idx" ON "overtime_requests"("siteManagerEmail");

-- CreateIndex
CREATE INDEX "overtime_requests_status_idx" ON "overtime_requests"("status");

-- CreateIndex
CREATE INDEX "overtime_requests_approvalRequestId_idx" ON "overtime_requests"("approvalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "safety_observations_observationNo_key" ON "safety_observations"("observationNo");

-- CreateIndex
CREATE INDEX "safety_observations_siteId_idx" ON "safety_observations"("siteId");

-- CreateIndex
CREATE INDEX "safety_observations_siteName_idx" ON "safety_observations"("siteName");

-- CreateIndex
CREATE INDEX "safety_observations_branch_idx" ON "safety_observations"("branch");

-- CreateIndex
CREATE INDEX "safety_observations_riskLevel_idx" ON "safety_observations"("riskLevel");

-- CreateIndex
CREATE INDEX "safety_observations_status_idx" ON "safety_observations"("status");

-- CreateIndex
CREATE INDEX "safety_observations_approvalRequestId_idx" ON "safety_observations"("approvalRequestId");

-- CreateIndex
CREATE INDEX "safety_observations_reportedByEmail_idx" ON "safety_observations"("reportedByEmail");

-- CreateIndex
CREATE UNIQUE INDEX "safety_incidents_incidentNo_key" ON "safety_incidents"("incidentNo");

-- CreateIndex
CREATE INDEX "safety_incidents_siteId_idx" ON "safety_incidents"("siteId");

-- CreateIndex
CREATE INDEX "safety_incidents_siteName_idx" ON "safety_incidents"("siteName");

-- CreateIndex
CREATE INDEX "safety_incidents_branch_idx" ON "safety_incidents"("branch");

-- CreateIndex
CREATE INDEX "safety_incidents_incidentType_idx" ON "safety_incidents"("incidentType");

-- CreateIndex
CREATE INDEX "safety_incidents_severity_idx" ON "safety_incidents"("severity");

-- CreateIndex
CREATE INDEX "safety_incidents_status_idx" ON "safety_incidents"("status");

-- CreateIndex
CREATE INDEX "safety_incidents_approvalRequestId_idx" ON "safety_incidents"("approvalRequestId");

-- CreateIndex
CREATE INDEX "safety_incidents_reportedByEmail_idx" ON "safety_incidents"("reportedByEmail");

-- CreateIndex
CREATE UNIQUE INDEX "safety_corrective_actions_actionNo_key" ON "safety_corrective_actions"("actionNo");

-- CreateIndex
CREATE INDEX "safety_corrective_actions_sourceType_sourceId_idx" ON "safety_corrective_actions"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "safety_corrective_actions_observationId_idx" ON "safety_corrective_actions"("observationId");

-- CreateIndex
CREATE INDEX "safety_corrective_actions_incidentId_idx" ON "safety_corrective_actions"("incidentId");

-- CreateIndex
CREATE INDEX "safety_corrective_actions_assignedToEmail_idx" ON "safety_corrective_actions"("assignedToEmail");

-- CreateIndex
CREATE INDEX "safety_corrective_actions_priority_idx" ON "safety_corrective_actions"("priority");

-- CreateIndex
CREATE INDEX "safety_corrective_actions_status_idx" ON "safety_corrective_actions"("status");

-- CreateIndex
CREATE INDEX "safety_corrective_actions_dueDate_idx" ON "safety_corrective_actions"("dueDate");

-- CreateIndex
CREATE INDEX "PaymentBatch_payrollRunId_idx" ON "PaymentBatch"("payrollRunId");

-- CreateIndex
CREATE INDEX "PaymentBatch_status_idx" ON "PaymentBatch"("status");

-- CreateIndex
CREATE INDEX "PaymentBatchItem_paymentBatchId_idx" ON "PaymentBatchItem"("paymentBatchId");

-- CreateIndex
CREATE INDEX "PaymentBatchItem_employeeId_idx" ON "PaymentBatchItem"("employeeId");

-- CreateIndex
CREATE INDEX "PaymentBatchItem_paymentStatus_idx" ON "PaymentBatchItem"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollRunEmployeeId_key" ON "Payslip"("payrollRunEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxYear_name_key" ON "TaxYear"("name");

-- CreateIndex
CREATE INDEX "system_audit_logs_module_idx" ON "system_audit_logs"("module");

-- CreateIndex
CREATE INDEX "system_audit_logs_entityType_entityId_idx" ON "system_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "system_audit_logs_performedAt_idx" ON "system_audit_logs"("performedAt");

-- CreateIndex
CREATE INDEX "system_audit_logs_performedBy_idx" ON "system_audit_logs"("performedBy");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_supervisorEmail_idx" ON "LeaveRequest"("supervisorEmail");

-- CreateIndex
CREATE INDEX "LeaveRequest_siteId_idx" ON "LeaveRequest"("siteId");

-- CreateIndex
CREATE INDEX "LeaveRequest_siteName_idx" ON "LeaveRequest"("siteName");

-- CreateIndex
CREATE INDEX "LeaveRequest_siteManagerEmail_idx" ON "LeaveRequest"("siteManagerEmail");

-- CreateIndex
CREATE INDEX "LeaveRequest_approvalRequestId_idx" ON "LeaveRequest"("approvalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "org_departments_code_key" ON "org_departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_code_key" ON "org_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "org_positions_positionCode_key" ON "org_positions"("positionCode");

-- CreateIndex
CREATE INDEX "approval_matrix_rules_module_workflowType_idx" ON "approval_matrix_rules"("module", "workflowType");

-- CreateIndex
CREATE INDEX "approval_requests_module_workflowType_idx" ON "approval_requests"("module", "workflowType");

-- CreateIndex
CREATE INDEX "approval_requests_sourceEntityType_sourceEntityId_idx" ON "approval_requests"("sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "ApprovalApproverAssignment_module_idx" ON "ApprovalApproverAssignment"("module");

-- CreateIndex
CREATE INDEX "ApprovalApproverAssignment_workflowType_idx" ON "ApprovalApproverAssignment"("workflowType");

-- CreateIndex
CREATE INDEX "ApprovalApproverAssignment_approvalRole_idx" ON "ApprovalApproverAssignment"("approvalRole");

-- CreateIndex
CREATE INDEX "ApprovalApproverAssignment_site_idx" ON "ApprovalApproverAssignment"("site");

-- CreateIndex
CREATE INDEX "ApprovalApproverAssignment_branch_idx" ON "ApprovalApproverAssignment"("branch");

-- CreateIndex
CREATE INDEX "ApprovalApproverAssignment_userEmail_idx" ON "ApprovalApproverAssignment"("userEmail");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_fromUserEmail_idx" ON "ApprovalDelegation"("fromUserEmail");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_toUserEmail_idx" ON "ApprovalDelegation"("toUserEmail");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_approvalRole_idx" ON "ApprovalDelegation"("approvalRole");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_site_idx" ON "ApprovalDelegation"("site");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_startsAt_endsAt_idx" ON "ApprovalDelegation"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "approval_decisions_approvalRequestId_idx" ON "approval_decisions"("approvalRequestId");

-- CreateIndex
CREATE INDEX "approval_notification_queue_approvalRequestId_idx" ON "approval_notification_queue"("approvalRequestId");

-- CreateIndex
CREATE INDEX "approval_notification_queue_approvalDecisionId_idx" ON "approval_notification_queue"("approvalDecisionId");

-- CreateIndex
CREATE INDEX "approval_notification_queue_toEmail_idx" ON "approval_notification_queue"("toEmail");

-- CreateIndex
CREATE INDEX "approval_notification_queue_status_idx" ON "approval_notification_queue"("status");

-- CreateIndex
CREATE INDEX "approval_notification_queue_queuedAt_idx" ON "approval_notification_queue"("queuedAt");

-- CreateIndex
CREATE INDEX "finance_report_export_logs_reportType_idx" ON "finance_report_export_logs"("reportType");

-- CreateIndex
CREATE INDEX "finance_report_export_logs_exportFormat_idx" ON "finance_report_export_logs"("exportFormat");

-- CreateIndex
CREATE INDEX "finance_report_export_logs_createdAt_idx" ON "finance_report_export_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "finance_expenses_expenseNo_key" ON "finance_expenses"("expenseNo");

-- CreateIndex
CREATE INDEX "finance_expenses_status_idx" ON "finance_expenses"("status");

-- CreateIndex
CREATE INDEX "finance_expenses_department_idx" ON "finance_expenses"("department");

-- CreateIndex
CREATE INDEX "finance_expenses_site_idx" ON "finance_expenses"("site");

-- CreateIndex
CREATE INDEX "finance_payment_evidence_expenseId_idx" ON "finance_payment_evidence"("expenseId");

-- CreateIndex
CREATE INDEX "finance_payment_evidence_paymentBatchId_idx" ON "finance_payment_evidence"("paymentBatchId");

-- CreateIndex
CREATE INDEX "finance_payment_evidence_procurementId_idx" ON "finance_payment_evidence"("procurementId");

-- CreateIndex
CREATE INDEX "hub_documents_module_idx" ON "hub_documents"("module");

-- CreateIndex
CREATE INDEX "hub_documents_sourceEntityType_sourceEntityId_idx" ON "hub_documents"("sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_requests_requisitionNo_key" ON "procurement_requests"("requisitionNo");

-- CreateIndex
CREATE INDEX "procurement_requests_status_idx" ON "procurement_requests"("status");

-- CreateIndex
CREATE INDEX "procurement_requests_department_idx" ON "procurement_requests"("department");

-- CreateIndex
CREATE INDEX "procurement_requests_site_idx" ON "procurement_requests"("site");

-- CreateIndex
CREATE INDEX "procurement_requests_supplierId_idx" ON "procurement_requests"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "hub_assets_assetNo_key" ON "hub_assets"("assetNo");

-- CreateIndex
CREATE INDEX "hub_assets_category_idx" ON "hub_assets"("category");

-- CreateIndex
CREATE INDEX "hub_assets_status_idx" ON "hub_assets"("status");

-- CreateIndex
CREATE INDEX "hub_assets_site_idx" ON "hub_assets"("site");

-- CreateIndex
CREATE INDEX "hub_assets_supplierId_idx" ON "hub_assets"("supplierId");

-- CreateIndex
CREATE INDEX "hub_asset_movements_assetId_idx" ON "hub_asset_movements"("assetId");

-- CreateIndex
CREATE INDEX "hub_asset_inspections_assetId_idx" ON "hub_asset_inspections"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_vehicles_registrationNo_key" ON "fleet_vehicles"("registrationNo");

-- CreateIndex
CREATE INDEX "fleet_vehicles_status_idx" ON "fleet_vehicles"("status");

-- CreateIndex
CREATE INDEX "fleet_vehicles_site_idx" ON "fleet_vehicles"("site");

-- CreateIndex
CREATE INDEX "fleet_driver_profiles_employeeId_idx" ON "fleet_driver_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "fleet_driver_profiles_employeeNumber_idx" ON "fleet_driver_profiles"("employeeNumber");

-- CreateIndex
CREATE INDEX "fleet_driver_profiles_status_idx" ON "fleet_driver_profiles"("status");

-- CreateIndex
CREATE INDEX "fleet_driver_profiles_site_idx" ON "fleet_driver_profiles"("site");

-- CreateIndex
CREATE INDEX "fleet_vehicle_assignments_vehicleId_idx" ON "fleet_vehicle_assignments"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_vehicle_assignments_driverId_idx" ON "fleet_vehicle_assignments"("driverId");

-- CreateIndex
CREATE INDEX "fleet_vehicle_assignments_status_idx" ON "fleet_vehicle_assignments"("status");

-- CreateIndex
CREATE INDEX "fleet_due_items_vehicleId_idx" ON "fleet_due_items"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_due_items_status_idx" ON "fleet_due_items"("status");

-- CreateIndex
CREATE INDEX "fleet_due_items_dueDate_idx" ON "fleet_due_items"("dueDate");

-- CreateIndex
CREATE INDEX "fleet_documents_vehicleId_idx" ON "fleet_documents"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_documents_documentType_idx" ON "fleet_documents"("documentType");

-- CreateIndex
CREATE INDEX "fleet_documents_expiryDate_idx" ON "fleet_documents"("expiryDate");

-- CreateIndex
CREATE INDEX "fleet_documents_status_idx" ON "fleet_documents"("status");

-- CreateIndex
CREATE INDEX "fleet_notifications_vehicleId_idx" ON "fleet_notifications"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_notifications_notificationType_idx" ON "fleet_notifications"("notificationType");

-- CreateIndex
CREATE INDEX "fleet_notifications_status_idx" ON "fleet_notifications"("status");

-- CreateIndex
CREATE INDEX "fleet_notifications_dueDate_idx" ON "fleet_notifications"("dueDate");

-- CreateIndex
CREATE INDEX "fleet_inspections_driverId_idx" ON "fleet_inspections"("driverId");

-- CreateIndex
CREATE INDEX "fleet_inspections_vehicleId_idx" ON "fleet_inspections"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_inspections_employeeId_idx" ON "fleet_inspections"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_defects_defectNo_key" ON "fleet_defects"("defectNo");

-- CreateIndex
CREATE INDEX "fleet_defects_vehicleId_idx" ON "fleet_defects"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_defects_status_idx" ON "fleet_defects"("status");

-- CreateIndex
CREATE INDEX "fleet_trips_driverId_idx" ON "fleet_trips"("driverId");

-- CreateIndex
CREATE INDEX "fleet_trips_vehicleId_idx" ON "fleet_trips"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_trips_tripDate_idx" ON "fleet_trips"("tripDate");

-- CreateIndex
CREATE INDEX "fleet_fuel_logs_driverId_idx" ON "fleet_fuel_logs"("driverId");

-- CreateIndex
CREATE INDEX "fleet_fuel_logs_vehicleId_idx" ON "fleet_fuel_logs"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_cost_postings_costNo_key" ON "fleet_cost_postings"("costNo");

-- CreateIndex
CREATE INDEX "fleet_cost_postings_vehicleId_idx" ON "fleet_cost_postings"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_cost_postings_status_idx" ON "fleet_cost_postings"("status");

-- CreateIndex
CREATE INDEX "fleet_cost_postings_costDate_idx" ON "fleet_cost_postings"("costDate");

-- CreateIndex
CREATE INDEX "fleet_cost_postings_month_idx" ON "fleet_cost_postings"("month");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_cost_postings_sourceType_sourceId_key" ON "fleet_cost_postings"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "quality_records_recordNo_key" ON "quality_records"("recordNo");

-- CreateIndex
CREATE INDEX "quality_records_status_idx" ON "quality_records"("status");

-- CreateIndex
CREATE INDEX "quality_records_site_idx" ON "quality_records"("site");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierCode_key" ON "suppliers"("supplierCode");

-- CreateIndex
CREATE INDEX "suppliers_supplierName_idx" ON "suppliers"("supplierName");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_itemCode_key" ON "stock_items"("itemCode");

-- CreateIndex
CREATE INDEX "stock_items_itemType_idx" ON "stock_items"("itemType");

-- CreateIndex
CREATE INDEX "stock_items_category_idx" ON "stock_items"("category");

-- CreateIndex
CREATE INDEX "stock_items_supplierId_idx" ON "stock_items"("supplierId");

-- CreateIndex
CREATE INDEX "stock_items_legacyCode_idx" ON "stock_items"("legacyCode");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_locationCode_key" ON "stock_locations"("locationCode");

-- CreateIndex
CREATE INDEX "stock_locations_site_idx" ON "stock_locations"("site");

-- CreateIndex
CREATE INDEX "stock_locations_branch_idx" ON "stock_locations"("branch");

-- CreateIndex
CREATE INDEX "stock_balances_locationId_idx" ON "stock_balances"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_stockItemId_locationId_key" ON "stock_balances"("stockItemId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_sessions_countNo_key" ON "stock_count_sessions"("countNo");

-- CreateIndex
CREATE INDEX "stock_count_sessions_locationId_idx" ON "stock_count_sessions"("locationId");

-- CreateIndex
CREATE INDEX "stock_count_sessions_status_idx" ON "stock_count_sessions"("status");

-- CreateIndex
CREATE INDEX "asset_depreciation_history_assetId_idx" ON "asset_depreciation_history"("assetId");

-- CreateIndex
CREATE INDEX "asset_depreciation_history_period_idx" ON "asset_depreciation_history"("period");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_movementNo_key" ON "stock_movements"("movementNo");

-- CreateIndex
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movementType");

-- CreateIndex
CREATE INDEX "stock_movements_status_idx" ON "stock_movements"("status");

-- CreateIndex
CREATE INDEX "stock_movements_fromLocationId_idx" ON "stock_movements"("fromLocationId");

-- CreateIndex
CREATE INDEX "stock_movements_toLocationId_idx" ON "stock_movements"("toLocationId");

-- CreateIndex
CREATE INDEX "stock_movements_financeExpenseId_idx" ON "stock_movements"("financeExpenseId");

-- CreateIndex
CREATE INDEX "stock_movements_procurementRequestId_idx" ON "stock_movements"("procurementRequestId");

-- CreateIndex
CREATE INDEX "stock_movements_workshopJobId_idx" ON "stock_movements"("workshopJobId");

-- CreateIndex
CREATE INDEX "stock_movements_referenceType_referenceId_idx" ON "stock_movements"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "stock_movement_lines_movementId_idx" ON "stock_movement_lines"("movementId");

-- CreateIndex
CREATE INDEX "stock_movement_lines_stockItemId_idx" ON "stock_movement_lines"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_movement_lines_qrTagId_idx" ON "stock_movement_lines"("qrTagId");

-- CreateIndex
CREATE INDEX "stock_ledger_stockItemId_idx" ON "stock_ledger"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_ledger_locationId_idx" ON "stock_ledger"("locationId");

-- CreateIndex
CREATE INDEX "stock_ledger_movementId_idx" ON "stock_ledger"("movementId");

-- CreateIndex
CREATE INDEX "stock_ledger_movementLineId_idx" ON "stock_ledger"("movementLineId");

-- CreateIndex
CREATE INDEX "stock_ledger_financeExpenseId_idx" ON "stock_ledger"("financeExpenseId");

-- CreateIndex
CREATE INDEX "stock_ledger_procurementRequestId_idx" ON "stock_ledger"("procurementRequestId");

-- CreateIndex
CREATE INDEX "stock_ledger_workshopJobId_idx" ON "stock_ledger"("workshopJobId");

-- CreateIndex
CREATE INDEX "stock_ledger_referenceType_referenceId_idx" ON "stock_ledger"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "stock_ledger_createdAt_idx" ON "stock_ledger"("createdAt");

-- CreateIndex
CREATE INDEX "stock_count_lines_sessionId_idx" ON "stock_count_lines"("sessionId");

-- CreateIndex
CREATE INDEX "stock_count_lines_stockItemId_idx" ON "stock_count_lines"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_count_lines_locationId_idx" ON "stock_count_lines"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_custody_assignments_assignmentNo_key" ON "asset_custody_assignments"("assignmentNo");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_assetId_idx" ON "asset_custody_assignments"("assetId");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_stockItemId_idx" ON "asset_custody_assignments"("stockItemId");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_qrTagId_idx" ON "asset_custody_assignments"("qrTagId");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_locationId_idx" ON "asset_custody_assignments"("locationId");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_financeExpenseId_idx" ON "asset_custody_assignments"("financeExpenseId");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_status_idx" ON "asset_custody_assignments"("status");

-- CreateIndex
CREATE INDEX "asset_custody_assignments_assignedToName_idx" ON "asset_custody_assignments"("assignedToName");

-- CreateIndex
CREATE UNIQUE INDEX "scaffold_deployments_deploymentNo_key" ON "scaffold_deployments"("deploymentNo");

-- CreateIndex
CREATE INDEX "scaffold_deployments_scaffoldComponentId_idx" ON "scaffold_deployments"("scaffoldComponentId");

-- CreateIndex
CREATE INDEX "scaffold_deployments_stockItemId_idx" ON "scaffold_deployments"("stockItemId");

-- CreateIndex
CREATE INDEX "scaffold_deployments_qrTagId_idx" ON "scaffold_deployments"("qrTagId");

-- CreateIndex
CREATE INDEX "scaffold_deployments_movementId_idx" ON "scaffold_deployments"("movementId");

-- CreateIndex
CREATE INDEX "scaffold_deployments_issuedToLocationId_idx" ON "scaffold_deployments"("issuedToLocationId");

-- CreateIndex
CREATE INDEX "scaffold_deployments_financeExpenseId_idx" ON "scaffold_deployments"("financeExpenseId");

-- CreateIndex
CREATE INDEX "scaffold_deployments_status_idx" ON "scaffold_deployments"("status");

-- CreateIndex
CREATE INDEX "scaffold_deployments_issuedToSite_idx" ON "scaffold_deployments"("issuedToSite");

-- CreateIndex
CREATE UNIQUE INDEX "scaffold_inspections_inspectionNo_key" ON "scaffold_inspections"("inspectionNo");

-- CreateIndex
CREATE INDEX "scaffold_inspections_scaffoldComponentId_idx" ON "scaffold_inspections"("scaffoldComponentId");

-- CreateIndex
CREATE INDEX "scaffold_inspections_qrTagId_idx" ON "scaffold_inspections"("qrTagId");

-- CreateIndex
CREATE INDEX "scaffold_inspections_inspectionStatus_idx" ON "scaffold_inspections"("inspectionStatus");

-- CreateIndex
CREATE INDEX "scaffold_inspections_inspectedAt_idx" ON "scaffold_inspections"("inspectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "asset_qr_tags_tagCode_key" ON "asset_qr_tags"("tagCode");

-- CreateIndex
CREATE INDEX "asset_qr_tags_tagCode_idx" ON "asset_qr_tags"("tagCode");

-- CreateIndex
CREATE INDEX "asset_qr_tags_assetId_idx" ON "asset_qr_tags"("assetId");

-- CreateIndex
CREATE INDEX "asset_qr_tags_stockItemId_idx" ON "asset_qr_tags"("stockItemId");

-- CreateIndex
CREATE INDEX "asset_qr_tags_assignedLocationId_idx" ON "asset_qr_tags"("assignedLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "scaffold_components_componentNo_key" ON "scaffold_components"("componentNo");

-- CreateIndex
CREATE INDEX "scaffold_components_componentType_idx" ON "scaffold_components"("componentType");

-- CreateIndex
CREATE INDEX "scaffold_components_tagStatus_idx" ON "scaffold_components"("tagStatus");

-- CreateIndex
CREATE INDEX "scaffold_components_currentSite_idx" ON "scaffold_components"("currentSite");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_workshop_jobs_jobCardNo_key" ON "fleet_workshop_jobs"("jobCardNo");

-- CreateIndex
CREATE INDEX "fleet_workshop_jobs_vehicleId_idx" ON "fleet_workshop_jobs"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_workshop_jobs_defectId_idx" ON "fleet_workshop_jobs"("defectId");

-- CreateIndex
CREATE INDEX "fleet_workshop_jobs_status_idx" ON "fleet_workshop_jobs"("status");

-- CreateIndex
CREATE INDEX "fleet_workshop_parts_workshopJobId_idx" ON "fleet_workshop_parts"("workshopJobId");

-- CreateIndex
CREATE INDEX "fleet_workshop_parts_stockItemId_idx" ON "fleet_workshop_parts"("stockItemId");

-- CreateIndex
CREATE INDEX "fleet_workshop_parts_issuedMovementId_idx" ON "fleet_workshop_parts"("issuedMovementId");

-- CreateIndex
CREATE INDEX "fleet_workshop_labour_workshopJobId_idx" ON "fleet_workshop_labour"("workshopJobId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetImportBatch_batchNo_key" ON "AssetImportBatch"("batchNo");

-- CreateIndex
CREATE INDEX "AssetImportLine_batchId_idx" ON "AssetImportLine"("batchId");

-- CreateIndex
CREATE INDEX "AssetImportLine_itemCode_idx" ON "AssetImportLine"("itemCode");

-- CreateIndex
CREATE INDEX "AssetImportLine_locationCode_idx" ON "AssetImportLine"("locationCode");

-- CreateIndex
CREATE INDEX "AssetImportLine_qrTagCode_idx" ON "AssetImportLine"("qrTagCode");

-- CreateIndex
CREATE INDEX "AssetImportLine_legacyCode_idx" ON "AssetImportLine"("legacyCode");

-- CreateIndex
CREATE UNIQUE INDEX "StoresRequisition_requisitionNo_key" ON "StoresRequisition"("requisitionNo");

-- CreateIndex
CREATE INDEX "StoresRequisition_requisitionNo_idx" ON "StoresRequisition"("requisitionNo");

-- CreateIndex
CREATE INDEX "StoresRequisition_status_idx" ON "StoresRequisition"("status");

-- CreateIndex
CREATE INDEX "StoresRequisition_site_idx" ON "StoresRequisition"("site");

-- CreateIndex
CREATE INDEX "StoresRequisition_branch_idx" ON "StoresRequisition"("branch");

-- CreateIndex
CREATE INDEX "StoresRequisition_department_idx" ON "StoresRequisition"("department");

-- CreateIndex
CREATE INDEX "StoresRequisition_approvalRequestId_idx" ON "StoresRequisition"("approvalRequestId");

-- CreateIndex
CREATE INDEX "StoresRequisitionLine_requisitionId_idx" ON "StoresRequisitionLine"("requisitionId");

-- CreateIndex
CREATE INDEX "StoresRequisitionLine_stockItemId_idx" ON "StoresRequisitionLine"("stockItemId");

-- CreateIndex
CREATE INDEX "StoresRequisitionLine_itemCode_idx" ON "StoresRequisitionLine"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "operational_sites_code_key" ON "operational_sites"("code");

-- CreateIndex
CREATE INDEX "site_manager_assignments_siteId_idx" ON "site_manager_assignments"("siteId");

-- CreateIndex
CREATE INDEX "site_manager_assignments_managerEmail_idx" ON "site_manager_assignments"("managerEmail");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_initiator_assignments" ADD CONSTRAINT "site_initiator_assignments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employmentTypeId_fkey" FOREIGN KEY ("employmentTypeId") REFERENCES "EmploymentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePortalAccount" ADD CONSTRAINT "EmployeePortalAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatutoryDetails" ADD CONSTRAINT "EmployeeStatutoryDetails_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBankAccount" ADD CONSTRAINT "EmployeeBankAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBankAuditLog" ADD CONSTRAINT "EmployeeBankAuditLog_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "EmployeeBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBankAuditLog" ADD CONSTRAINT "EmployeeBankAuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeContract" ADD CONSTRAINT "EmployeeContract_contractTypeId_fkey" FOREIGN KEY ("contractTypeId") REFERENCES "ContractType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeContract" ADD CONSTRAINT "EmployeeContract_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceConditionTemplate" ADD CONSTRAINT "ServiceConditionTemplate_employmentTypeId_fkey" FOREIGN KEY ("employmentTypeId") REFERENCES "EmploymentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceConditionComponent" ADD CONSTRAINT "ServiceConditionComponent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceConditionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeServiceCondition" ADD CONSTRAINT "EmployeeServiceCondition_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeServiceCondition" ADD CONSTRAINT "EmployeeServiceCondition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceConditionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_corrective_actions" ADD CONSTRAINT "safety_corrective_actions_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "safety_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_corrective_actions" ADD CONSTRAINT "safety_corrective_actions_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "safety_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEmployee" ADD CONSTRAINT "PayrollRunEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEmployee" ADD CONSTRAINT "PayrollRunEmployee_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEarning" ADD CONSTRAINT "PayrollEarning_payrollRunEmployeeId_fkey" FOREIGN KEY ("payrollRunEmployeeId") REFERENCES "PayrollRunEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDeduction" ADD CONSTRAINT "PayrollDeduction_payrollRunEmployeeId_fkey" FOREIGN KEY ("payrollRunEmployeeId") REFERENCES "PayrollRunEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollApproval" ADD CONSTRAINT "PayrollApproval_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatch" ADD CONSTRAINT "PaymentBatch_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatchItem" ADD CONSTRAINT "PaymentBatchItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatchItem" ADD CONSTRAINT "PaymentBatchItem_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES "PaymentBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatchItem" ADD CONSTRAINT "PaymentBatchItem_payrollRunEmployeeId_fkey" FOREIGN KEY ("payrollRunEmployeeId") REFERENCES "PayrollRunEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunEmployeeId_fkey" FOREIGN KEY ("payrollRunEmployeeId") REFERENCES "PayrollRunEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeBand" ADD CONSTRAINT "PayeBand_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "org_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_reportsToPositionId_fkey" FOREIGN KEY ("reportsToPositionId") REFERENCES "org_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "org_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_matrix_rules" ADD CONSTRAINT "approval_matrix_rules_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "org_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approvalMatrixRuleId_fkey" FOREIGN KEY ("approvalMatrixRuleId") REFERENCES "approval_matrix_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalApproverAssignment" ADD CONSTRAINT "ApprovalApproverAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_assets" ADD CONSTRAINT "hub_assets_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_asset_movements" ADD CONSTRAINT "hub_asset_movements_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hub_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_asset_inspections" ADD CONSTRAINT "hub_asset_inspections_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hub_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_vehicle_assignments" ADD CONSTRAINT "fleet_vehicle_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "fleet_driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_vehicle_assignments" ADD CONSTRAINT "fleet_vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_due_items" ADD CONSTRAINT "fleet_due_items_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_documents" ADD CONSTRAINT "fleet_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_notifications" ADD CONSTRAINT "fleet_notifications_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_inspections" ADD CONSTRAINT "fleet_inspections_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "fleet_driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_inspections" ADD CONSTRAINT "fleet_inspections_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_defects" ADD CONSTRAINT "fleet_defects_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_trips" ADD CONSTRAINT "fleet_trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "fleet_driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_trips" ADD CONSTRAINT "fleet_trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_fuel_logs" ADD CONSTRAINT "fleet_fuel_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "fleet_driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_fuel_logs" ADD CONSTRAINT "fleet_fuel_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_cost_postings" ADD CONSTRAINT "fleet_cost_postings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation_history" ADD CONSTRAINT "asset_depreciation_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hub_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_financeExpenseId_fkey" FOREIGN KEY ("financeExpenseId") REFERENCES "finance_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "procurement_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_workshopJobId_fkey" FOREIGN KEY ("workshopJobId") REFERENCES "fleet_workshop_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement_lines" ADD CONSTRAINT "stock_movement_lines_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "stock_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement_lines" ADD CONSTRAINT "stock_movement_lines_qrTagId_fkey" FOREIGN KEY ("qrTagId") REFERENCES "asset_qr_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement_lines" ADD CONSTRAINT "stock_movement_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_financeExpenseId_fkey" FOREIGN KEY ("financeExpenseId") REFERENCES "finance_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_movementLineId_fkey" FOREIGN KEY ("movementLineId") REFERENCES "stock_movement_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "procurement_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_workshopJobId_fkey" FOREIGN KEY ("workshopJobId") REFERENCES "fleet_workshop_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "stock_count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hub_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_financeExpenseId_fkey" FOREIGN KEY ("financeExpenseId") REFERENCES "finance_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_qrTagId_fkey" FOREIGN KEY ("qrTagId") REFERENCES "asset_qr_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custody_assignments" ADD CONSTRAINT "asset_custody_assignments_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_deployments" ADD CONSTRAINT "scaffold_deployments_financeExpenseId_fkey" FOREIGN KEY ("financeExpenseId") REFERENCES "finance_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_deployments" ADD CONSTRAINT "scaffold_deployments_issuedToLocationId_fkey" FOREIGN KEY ("issuedToLocationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_deployments" ADD CONSTRAINT "scaffold_deployments_qrTagId_fkey" FOREIGN KEY ("qrTagId") REFERENCES "asset_qr_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_deployments" ADD CONSTRAINT "scaffold_deployments_scaffoldComponentId_fkey" FOREIGN KEY ("scaffoldComponentId") REFERENCES "scaffold_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_deployments" ADD CONSTRAINT "scaffold_deployments_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_inspections" ADD CONSTRAINT "scaffold_inspections_qrTagId_fkey" FOREIGN KEY ("qrTagId") REFERENCES "asset_qr_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_inspections" ADD CONSTRAINT "scaffold_inspections_scaffoldComponentId_fkey" FOREIGN KEY ("scaffoldComponentId") REFERENCES "scaffold_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_tags" ADD CONSTRAINT "asset_qr_tags_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hub_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_tags" ADD CONSTRAINT "asset_qr_tags_assignedLocationId_fkey" FOREIGN KEY ("assignedLocationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_tags" ADD CONSTRAINT "asset_qr_tags_scaffoldComponentId_fkey" FOREIGN KEY ("scaffoldComponentId") REFERENCES "scaffold_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_qr_tags" ADD CONSTRAINT "asset_qr_tags_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_components" ADD CONSTRAINT "scaffold_components_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_workshop_jobs" ADD CONSTRAINT "fleet_workshop_jobs_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "fleet_defects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_workshop_jobs" ADD CONSTRAINT "fleet_workshop_jobs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_workshop_parts" ADD CONSTRAINT "fleet_workshop_parts_issuedMovementId_fkey" FOREIGN KEY ("issuedMovementId") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_workshop_parts" ADD CONSTRAINT "fleet_workshop_parts_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_workshop_parts" ADD CONSTRAINT "fleet_workshop_parts_workshopJobId_fkey" FOREIGN KEY ("workshopJobId") REFERENCES "fleet_workshop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_workshop_labour" ADD CONSTRAINT "fleet_workshop_labour_workshopJobId_fkey" FOREIGN KEY ("workshopJobId") REFERENCES "fleet_workshop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetImportLine" ADD CONSTRAINT "AssetImportLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AssetImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoresRequisitionLine" ADD CONSTRAINT "StoresRequisitionLine_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "StoresRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_manager_assignments" ADD CONSTRAINT "site_manager_assignments_operationalSiteId_fkey" FOREIGN KEY ("operationalSiteId") REFERENCES "operational_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_manager_assignments" ADD CONSTRAINT "site_manager_assignments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
