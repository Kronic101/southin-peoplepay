# Southin PeoplePay

Southin PeoplePay is an internal HR and payroll management platform designed for Southin Contracting Limited. It supports employee records, statutory payroll setup, HR and Finance readiness controls, payroll processing, payslip generation, manual payment batch preparation, director approval, and finance audit evidence.

---

## Main Features

* Employee register and HR profile management
* Employee portal login using employee number and PIN
* Forced first-login PIN change
* Forgot PIN workflow
* Statutory details for PAYE, NAPSA, NHIMA, and employer cost control
* Bank account registration and Finance validation
* Bank audit history per employee
* HR and Finance payroll readiness gates
* Payroll run creation for ready employees only
* Gross pay entry and statutory calculations
* Payroll review workflow
* Payslip generation
* Payment batch creation from locked payroll runs
* Payment batch recheck for payslip availability
* Finance payment batch preparation
* Director approval for manual payment processing
* Clean payment batch audit evidence page
* CSV evidence export
* SharePoint export package foundation
* Role-based access control foundation

---

## Technology Stack

| Layer           | Technology                    |
| --------------- | ----------------------------- |
| Frontend        | Next.js                       |
| Backend         | NestJS                        |
| Database        | PostgreSQL                    |
| ORM             | Prisma                        |
| Package Manager | pnpm                          |
| Hosting Target  | Azure / Supabase / SharePoint |
| Identity Target | Microsoft Entra ID            |

---

## Repository Structure

```text
southin-peoplepay/
  apps/
    api/        NestJS backend API
    web/        Next.js frontend
  docs/         Project documentation and demo guides
```

---

## Local Setup

Install dependencies:

```powershell
pnpm install
```

Generate Prisma client:

```powershell
pnpm db:generate
```

Push database schema:

```powershell
pnpm db:push
```

Start the development servers:

```powershell
pnpm dev
```

Open:

```text
Frontend: http://localhost:3000
API:      http://localhost:4000/api
```

---

## Environment Variables

Backend environment file:

```text
apps/api/.env
```

Frontend environment file:

```text
apps/web/.env.local
```

Minimum frontend variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Minimum backend variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="replace-with-secure-secret"
RBAC_ENFORCEMENT_ENABLED=true
EMAIL_ENABLED=false
SHAREPOINT_GRAPH_ENABLED=false
```

---

## Development RBAC

The development frontend includes a floating **Dev Role** selector used to test protected workflow actions.

Available roles:

```text
ADMIN
PAYROLL_OFFICER
HR_MANAGER
FINANCE_MANAGER
DIRECTOR
EMPLOYEE
```

The frontend sends the selected role to the API using:

```text
x-user-role
```

In production, this should be replaced by Microsoft Entra ID authentication and role claims.

---

## Payroll Workflow

The expected payroll flow is:

1. HR completes employee profile.
2. Finance validates statutory and bank details.
3. Payroll readiness gates confirm employee readiness.
4. Payroll Officer creates payroll run for ready employees.
5. Payroll Officer enters gross pay.
6. Payroll is submitted for HR review.
7. HR Manager approves.
8. Finance Manager approves.
9. Director approves.
10. Payroll is locked.
11. Payslips are generated.
12. Finance creates or opens payment batch.
13. Finance rechecks payslips and prepares batch.
14. Director approves payment batch for manual processing.
15. Finance evidence is generated.

---

## Payment Batch Workflow

Payment batches do not trigger live bank payments.

They are controlled finance records used for manual payment preparation and audit evidence.

Payment batch statuses include:

| Status                   | Meaning                             |
| ------------------------ | ----------------------------------- |
| BLOCKED_PAYSLIPS_MISSING | Payslips are missing                |
| DRAFT                    | Payslips and bank details are ready |
| PREPARED                 | Finance prepared the batch          |
| APPROVED                 | Director approved the batch         |

Payment item statuses include:

| Status                      | Meaning                                |
| --------------------------- | -------------------------------------- |
| BLOCKED_PAYSLIP_MISSING     | Payslip not found                      |
| READY_FOR_PAYMENT           | Ready for Finance preparation          |
| APPROVED_FOR_MANUAL_PAYMENT | Approved for manual payment processing |

---

## Audit Evidence

The payment batch evidence page shows:

* Batch name
* Payroll run
* Prepared by
* Approved by
* Approval timestamp
* Employee payment evidence
* Masked bank account details
* Finance controls
* Recommended SharePoint storage

Evidence CSV can be downloaded from the approved payment batch page.

---

## SharePoint Foundation

The application includes SharePoint export payloads for:

* Executive dashboard summary
* Finance payroll audit evidence
* Public dashboard summary
* Export logs
* Graph setup guide
* Graph discovery guide

Microsoft Graph publishing remains disabled until the Azure app registration, permissions, site IDs, and library IDs are configured.

---

## Important Production Notes

Before production deployment:

* Remove or disable the Dev Role selector.
* Replace development RBAC headers with Microsoft Entra ID role claims.
* Store secrets securely.
* Enable SMTP only after testing.
* Enable Microsoft Graph only after app permissions are approved.
* Restrict evidence exports to authorised Finance and Director users.
* Ensure all bank account numbers are masked outside restricted Finance workflows.
* Enable database backups and monitoring.

---

## Useful Commands

Check branch:

```powershell
git branch
```

Commit work:

```powershell
git status
git add .
git commit -m "Your commit message"
git push origin feature/hr-employee-profile-completion
```

Generate Prisma client:

```powershell
pnpm db:generate
```

Push schema:

```powershell
pnpm db:push
```

Run app:

```powershell
pnpm dev
```

---

## Current MVP Status

Completed:

* Employee management
* Employee portal login
* PIN reset flow
* Bank validation and audit history
* Payroll readiness gates
* Payroll creation readiness enforcement
* Payroll approval workflow
* Payslip generation
* Payment batch preparation
* Director approval
* Audit evidence page
* CSV evidence export
* SharePoint export package foundation
* Development RBAC selector and backend RBAC guard

Next recommended phase:

* Replace Dev Role selector with Microsoft Entra ID integration
* Harden audit immutability
* Add production deployment pipeline
* Add backup and restore procedure
* Add formal user acceptance testing scripts
