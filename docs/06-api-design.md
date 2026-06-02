# API Design Summary

## Authentication

```text
POST /api/auth/microsoft/login
GET  /api/auth/microsoft/callback
POST /api/auth/employee/login
POST /api/auth/employee/change-pin
POST /api/auth/logout
GET  /api/auth/me
```

## Employees

```text
GET    /api/employees
POST   /api/employees
GET    /api/employees/:id
PATCH  /api/employees/:id
GET    /api/employees/:id/documents
POST   /api/employees/:id/documents
GET    /api/employees/:id/contracts
POST   /api/employees/:id/contracts
GET    /api/employees/:id/service-conditions
POST   /api/employees/:id/service-conditions
```

## Payroll

```text
GET    /api/payroll/periods
POST   /api/payroll/periods
GET    /api/payroll/runs
POST   /api/payroll/runs
POST   /api/payroll/runs/:id/calculate
POST   /api/payroll/runs/:id/submit
POST   /api/payroll/runs/:id/hr-review
POST   /api/payroll/runs/:id/finance-review
POST   /api/payroll/runs/:id/director-approve
POST   /api/payroll/runs/:id/lock
POST   /api/payroll/runs/:id/generate-payslips
```

## Dashboard

```text
GET /api/dashboard/hr
GET /api/dashboard/payroll
GET /api/dashboard/executive
GET /api/dashboard/statutory
GET /api/dashboard/casual-labour
```

## SharePoint integration

```text
POST /api/integrations/sharepoint/publish-executive-dashboard
POST /api/integrations/sharepoint/upload-payroll-summary
POST /api/integrations/sharepoint/upload-statutory-report
POST /api/integrations/sharepoint/upload-bank-file
GET  /api/integrations/sharepoint/status
```
