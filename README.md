# Southin PeoplePay

Southin PeoplePay is an independent HR and Payroll Management web application for Southin Contracting Limited.

It is designed to manage employee records, temporary and casual workers, conditions of service, payroll approvals, statutory payroll configuration, payslips, audit reporting, and Executive Page dashboard integration with SharePoint.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js / React / TypeScript |
| Backend | Node.js / NestJS / TypeScript |
| Database | PostgreSQL on Supabase |
| ORM | Prisma |
| Authentication | Microsoft 365 / Entra ID for admins, Employee Number + PIN for employees |
| Storage | Supabase Storage and SharePoint archive |
| Dashboard | SharePoint Executive Page + Power BI-ready API data |

## Repository structure

```text
apps/web        Next.js frontend
apps/api        NestJS backend API and payroll engine foundation
packages/shared Shared constants, types, validation helpers
docs            Editable project documentation for team review and audit readiness
scripts         Helper scripts for setup and database tasks
```

## First milestone

The first milestone proves the framework:

- Monorepo structure
- Web app placeholder pages
- API placeholder modules
- Prisma schema foundation
- Seed data for roles, departments, employment types, statuses, and statutory placeholders
- Editable documentation for Southin team review

## Important payroll compliance note

The statutory calculation setup must be validated by HR and Finance before real payroll use. PAYE, NAPSA, NHIMA, SDL, and Workers Compensation rules are configurable in the database and should be approved before go-live.

## Development workflow

Always pull before working on a different laptop:

```bash
git status
git pull
```

After changes:

```bash
git add .
git commit -m "Describe change clearly"
git push
```
