# Southin PeoplePay Deployment Notes

## Overview

Southin PeoplePay is an HR, payroll, statutory deduction, payslip, payment batch, and audit evidence management system for Southin Contracting Limited.

The application is built as a monorepo with:

| Layer                     | Technology                                               |
| ------------------------- | -------------------------------------------------------- |
| Frontend                  | Next.js                                                  |
| Backend API               | NestJS                                                   |
| Database                  | PostgreSQL / Supabase                                    |
| ORM                       | Prisma                                                   |
| Authentication Foundation | Employee PIN login and future Microsoft Entra ID         |
| RBAC                      | Role-based access control using backend guards           |
| Audit Evidence            | JSON and CSV finance evidence packs                      |
| SharePoint Integration    | Export payload foundation with Microsoft Graph readiness |

---

## Local Development URLs

| Service       | URL                           |
| ------------- | ----------------------------- |
| Frontend      | http://localhost:3000         |
| Backend API   | http://localhost:4000/api     |
| Prisma Studio | Optional local Prisma tooling |

---

## Required Environment Variables

Create or update:

```text
apps/api/.env
```

Minimum required values:

```env
NODE_ENV=development
APP_NAME="Southin PeoplePay"
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api

DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

JWT_SECRET="replace-with-secure-secret"

RBAC_ENFORCEMENT_ENABLED=true

EMAIL_ENABLED=false

SHAREPOINT_GRAPH_ENABLED=false
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
SHAREPOINT_EXECUTIVE_SITE_ID=
SHAREPOINT_FINANCE_SITE_ID=
SHAREPOINT_HR_SITE_ID=
SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID=
SHAREPOINT_FINANCE_AUDIT_DRIVE_ID=
SHAREPOINT_EXECUTIVE_PAGE_LIST_ID=
SHAREPOINT_PUBLIC_PAGE_LIST_ID=
```

For frontend, ensure:

```text
apps/web/.env.local
```

contains:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## Install Dependencies

From the repository root:

```powershell
pnpm install
```

---

## Generate Prisma Client

```powershell
pnpm db:generate
```

---

## Push Database Schema

Use carefully. Confirm that Prisma is not dropping required tables or columns before accepting changes.

```powershell
pnpm db:push
```

If Prisma warns that it will drop important payroll, payment, SharePoint, payslip, or bank audit tables, stop and check that the correct branch and schema are in use.

---

## Run Development Servers

```powershell
pnpm dev
```

Expected:

| Service | Port |
| ------- | ---- |
| API     | 4000 |
| Web     | 3000 |

---

## RBAC Enforcement

RBAC is controlled by:

```env
RBAC_ENFORCEMENT_ENABLED=true
```

During development, the frontend sends:

```text
x-user-role
```

using the floating Dev Role selector.

Supported roles:

```text
ADMIN
PAYROLL_OFFICER
HR_MANAGER
FINANCE_MANAGER
DIRECTOR
EMPLOYEE
```

Production should replace the Dev Role selector with Microsoft Entra ID role claims.

---

## Protected Workflow Areas

| Area                      | Required Role            |
| ------------------------- | ------------------------ |
| Payroll run creation      | PAYROLL_OFFICER or ADMIN |
| Gross pay entry           | PAYROLL_OFFICER or ADMIN |
| HR review                 | HR_MANAGER or ADMIN      |
| Finance review            | FINANCE_MANAGER or ADMIN |
| Director approval         | DIRECTOR or ADMIN        |
| Payroll locking           | DIRECTOR or ADMIN        |
| Payslip generation        | PAYROLL_OFFICER or ADMIN |
| Employee bank validation  | FINANCE_MANAGER or ADMIN |
| Payment batch recheck     | FINANCE_MANAGER or ADMIN |
| Payment batch preparation | FINANCE_MANAGER or ADMIN |
| Payment batch approval    | DIRECTOR or ADMIN        |
| SharePoint export package | ADMIN or DIRECTOR        |

---

## Production Deployment Considerations

Before production use:

1. Remove or disable the floating Dev Role selector.
2. Integrate Microsoft Entra ID authentication for staff users.
3. Map Entra ID group claims to application roles.
4. Move all secrets to a secure secret store.
5. Enable SMTP only after testing.
6. Enable Microsoft Graph only after app registration permissions are approved.
7. Configure CORS strictly for the production frontend domain.
8. Ensure audit logs cannot be edited from the UI.
9. Ensure bank account numbers are masked in all non-Finance outputs.
10. Ensure production backups are enabled for the PostgreSQL database.

---

## Recommended Production Hosting

| Component     | Suggested Hosting                                    |
| ------------- | ---------------------------------------------------- |
| Web frontend  | Azure App Service, Azure Static Web Apps, or Vercel  |
| API backend   | Azure App Service, Azure Container Apps, or VPS      |
| Database      | Supabase PostgreSQL or Azure Database for PostgreSQL |
| File evidence | SharePoint document libraries                        |
| Identity      | Microsoft Entra ID                                   |
| Monitoring    | Azure Application Insights or equivalent             |

---

## SharePoint Integration

Current SharePoint implementation supports controlled export payloads and development export logs.

Graph publishing remains disabled until these values are configured:

```env
SHAREPOINT_GRAPH_ENABLED=true
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
SHAREPOINT_EXECUTIVE_SITE_ID=
SHAREPOINT_FINANCE_SITE_ID=
SHAREPOINT_HR_SITE_ID=
SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID=
SHAREPOINT_FINANCE_AUDIT_DRIVE_ID=
```

Until Graph is enabled, exports remain controlled audit payloads and development logs.

---

## Deployment Validation Checklist

* [ ] Frontend loads successfully
* [ ] API health endpoint responds
* [ ] Database connection works
* [ ] Prisma client generated
* [ ] Employee list loads
* [ ] Payroll readiness gates load
* [ ] Payroll run creation is RBAC protected
* [ ] Bank validation is RBAC protected
* [ ] Payment batch approval is RBAC protected
* [ ] Evidence page masks bank accounts
* [ ] CSV export works
* [ ] SharePoint export package loads only for authorised roles
* [ ] Dev Role selector disabled before production
