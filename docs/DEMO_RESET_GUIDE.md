# Southin PeoplePay Demo Reset Guide

## Purpose

This guide explains how to reset Southin PeoplePay into a clean demo-ready state for internal presentations, testing, and stakeholder walkthroughs.

The demo environment is intended to show the full payroll lifecycle:

1. Employee registration and HR profile completion
2. HR and Finance readiness gates
3. Payroll run creation for ready employees only
4. Payroll approval workflow
5. Payslip generation
6. Payment batch preparation
7. Director approval for manual payment processing
8. Finance audit evidence generation

---

## Demo Roles

During development, role-based access is tested using the floating **Dev Role** selector in the frontend.

Available roles:

| Role            | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| ADMIN           | Full system administration and SharePoint export control   |
| PAYROLL_OFFICER | Payroll run creation, gross pay entry, payslip generation  |
| HR_MANAGER      | HR review and employee readiness checks                    |
| FINANCE_MANAGER | Bank validation, finance review, payment batch preparation |
| DIRECTOR        | Final payroll approval and payment batch approval          |
| EMPLOYEE        | Employee self-service access only                          |

---

## Recommended Demo Users

| Employee  | Purpose                                                            |
| --------- | ------------------------------------------------------------------ |
| Mary Test | Payroll-ready employee used for successful payroll processing      |
| John Test | Blocked employee used to demonstrate HR/Finance readiness controls |

Mary should be configured as:

| Area                  | Expected Value |
| --------------------- | -------------- |
| Employee Status       | ACTIVE         |
| Contract Status       | ACTIVE         |
| Department            | Procurement    |
| Job Title             | Employee       |
| Site                  | Project Site   |
| Employment Type       | Fixed-Term     |
| Bank Status           | VALIDATED      |
| Primary Bank Account  | APPROVED       |
| Conditions of Service | APPROVED       |

John should remain incomplete to demonstrate blocking:

| Area            | Expected Value    |
| --------------- | ----------------- |
| Employee Status | DRAFT             |
| Department      | Missing           |
| Bank Details    | Missing / Pending |
| Contract        | Missing or Draft  |
| Payroll Ready   | NO                |

---

## SQL Reset for Mary Demo Readiness

Run this in Supabase SQL Editor if Mary needs to be restored to payroll-ready status:

```sql
UPDATE "Employee"
SET "status" = 'ACTIVE'
WHERE "id" = '19e7288c-98d3-418e-9225-f21cf0f5642a';

UPDATE "EmployeeContract"
SET "status" = 'ACTIVE'
WHERE "employeeId" = '19e7288c-98d3-418e-9225-f21cf0f5642a';

UPDATE "EmployeeBankAccount"
SET "approvalStatus" = 'APPROVED',
    "isPrimary" = true
WHERE "employeeId" = '19e7288c-98d3-418e-9225-f21cf0f5642a'
  AND "bankName" = 'FNB Zambia';

UPDATE "Employee"
SET
  "bankDetailsStatus" = 'VALIDATED',
  "bankDetailsReviewedBy" = 'finance-manager-dev',
  "bankDetailsReviewedAt" = NOW(),
  "bankDetailsNotes" = 'Mary bank details validated for payroll demo readiness.'
WHERE "id" = '19e7288c-98d3-418e-9225-f21cf0f5642a';
```

---

## SQL Reset for John as Blocked Demo Employee

Run this if John needs to remain blocked:

```sql
UPDATE "Employee"
SET "status" = 'DRAFT',
    "departmentId" = NULL,
    "jobTitleId" = NULL,
    "siteId" = NULL,
    "employmentTypeId" = NULL,
    "bankDetailsStatus" = 'PENDING_VALIDATION',
    "bankName" = NULL,
    "bankBranch" = NULL,
    "bankAccountNumber" = NULL,
    "bankAccountName" = NULL
WHERE "employeeNumber" = 'STH-000001';
```

---

## Demo Flow

### 1. Confirm Readiness Gates

Open:

```text
http://localhost:3000/reports/payroll-readiness
```

Expected result:

| Employee  | HR Gate | Finance Gate | Payroll Ready |
| --------- | ------- | ------------ | ------------- |
| Mary Test | READY   | READY        | YES           |
| John Test | BLOCKED | BLOCKED      | NO            |

---

### 2. Create Payroll Run

Open:

```text
http://localhost:3000/payroll/runs/new
```

Set Dev Role:

```text
PAYROLL_OFFICER
```

Use:

| Field                 | Value                                   |
| --------------------- | --------------------------------------- |
| Payroll Period        | June 2026 Payroll                       |
| Run Name              | Demo Payroll Run                        |
| Run Type              | MONTHLY                                 |
| Readiness Enforcement | Create payroll for ready employees only |

Expected result:

```text
Payroll run created with Mary only.
John is excluded because he is not payroll-ready.
```

---

### 3. Enter Gross Pay

Open the new payroll run.

Set Dev Role:

```text
PAYROLL_OFFICER
```

Enter Mary’s gross pay:

```text
8500
```

Click:

```text
Update
```

Expected totals:

| Field      | Expected   |
| ---------- | ---------- |
| Gross Pay  | 8500       |
| Deductions | Calculated |
| Net Pay    | Calculated |

---

### 4. Payroll Approval Workflow

Run the workflow in this order:

| Step              | Dev Role        | Action                 |
| ----------------- | --------------- | ---------------------- |
| Submit to HR      | PAYROLL_OFFICER | Submit payroll         |
| HR Review         | HR_MANAGER      | Approve HR review      |
| Finance Review    | FINANCE_MANAGER | Approve finance review |
| Director Approval | DIRECTOR        | Approve payroll        |
| Lock Payroll      | DIRECTOR        | Lock payroll           |
| Generate Payslips | PAYROLL_OFFICER | Generate payslips      |

Expected final payroll status:

```text
LOCKED
```

Expected payslip status:

```text
Generated
```

---

### 5. Create or Open Payment Batch

Open:

```text
http://localhost:3000/reports/payment-batches
```

Open the relevant payment batch.

Set Dev Role:

```text
FINANCE_MANAGER
```

Click:

```text
Recheck Payslips
```

Expected:

```text
Payment batch moves from blocked to DRAFT when payslips are found.
```

Then click:

```text
Prepare Batch
```

Expected status:

```text
PREPARED
```

---

### 6. Director Payment Approval

Set Dev Role:

```text
DIRECTOR
```

Click:

```text
Approve Batch
```

Expected status:

```text
APPROVED
```

Expected item payment status:

```text
APPROVED_FOR_MANUAL_PAYMENT
```

---

### 7. Evidence Pack

Open:

```text
/reports/payment-batches/[batchId]/evidence
```

Expected evidence page should show:

1. Batch approval details
2. Prepared by
3. Approved by
4. Masked bank account details
5. Finance controls
6. Recommended SharePoint storage

Download:

```text
Download Evidence CSV
```

Expected:

```text
CSV downloads successfully when role is ADMIN, DIRECTOR, or authorised Finance role depending on backend configuration.
```

---

## Demo Notes

This system does not trigger live bank payments. Payment batches are controlled manual payment preparation records only.

Bank account numbers must remain masked in evidence views.

Only authorised Finance and Director users should access final payment evidence.

---

## Reset Checklist Before Demo

* [ ] Backend running on port 4000
* [ ] Frontend running on port 3000
* [ ] Supabase connection working
* [ ] Mary is ACTIVE and payroll-ready
* [ ] John is blocked for readiness demo
* [ ] Dev Role selector is visible
* [ ] RBAC enforcement is enabled
* [ ] Payroll readiness page loads
* [ ] Payment batch evidence page loads
* [ ] CSV export works
