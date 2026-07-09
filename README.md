# Southin PeoplePay

Southin PeoplePay is an internal HR, Payroll, Stores, Procurement, Asset, Fleet, and Employee Self-Service platform for Southin Contracting Limited.

The system is being built as Southin’s operations hub, combining Microsoft 365 staff authentication, employee PIN-based access, approval workflows, payroll readiness controls, stores requisitions, stock visibility, scaffold tracking, asset records, and finance audit evidence.

---

## Current MVP Scope

The current MVP covers:

- Microsoft Entra ID staff authentication
- Staff role mapping from Microsoft 365 / Entra security groups
- Employee portal login using Employee Number + PIN
- Forced first-login PIN change
- HR employee profile management
- Employee site/location assignment
- Employee portal access profiles
- Bank account capture and Finance validation
- Statutory details for PAYE, NAPSA, and NHIMA
- Payroll readiness gates
- Payroll periods and payroll runs
- Payroll approval workflow
- Payslip generation
- Employee payslip portal
- Payment batch preparation
- Director approval control
- Finance audit evidence
- Approval inbox
- Microsoft Graph email notifications
- Sites, warehouses, containers, yards, and quarantine locations
- Site manager and requisition initiator assignments
- Stores requisitions and approval linkage
- Stock master data import
- Stock location import
- Opening stock balances
- Scaffold component register
- Hub asset and fleet/asset register foundation
- Attendance, leave, overtime, and timesheet dashboard pages

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js / React / TypeScript |
| Backend | NestJS / Node.js / TypeScript |
| Database | PostgreSQL on Supabase |
| ORM | Prisma |
| Authentication | Microsoft Entra ID for staff, Employee Number + PIN for employees |
| Email | Microsoft Graph Mail |
| Hosting | Railway / Cloudflare |
| DNS | Cloudflare |
| Storage Target | SharePoint / Supabase Storage |
| Package Manager | pnpm |

---

## Repository Structure

```text
southin-peoplepay/
  apps/
    api/        NestJS backend API
    web/        Next.js frontend
    mobile/     Mobile app foundation
  docs/         Project documentation and operating guides
  packages/     Shared packages and types
  scripts/      Helper scripts
  sql/          Database seed, staging, import, and cleanup scripts