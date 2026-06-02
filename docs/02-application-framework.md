# Application Framework

## Architecture

```text
Next.js frontend
↓
NestJS backend API
↓
PostgreSQL database on Supabase
↓
SharePoint / Power BI reporting integration
```

## Main modules

1. Authentication and access control
2. HR core employee management
3. Contract management
4. Conditions of service
5. Attendance and timesheets
6. Leave management
7. Payroll engine
8. Payroll approval workflow
9. Statutory compliance
10. Payslip management
11. SharePoint and Executive Dashboard integration
12. Audit and transparency reporting

## Authentication model

| User group | Login method |
|---|---|
| HR, Finance, Directors, Managers | Microsoft 365 / Entra ID |
| Employees without M365 | Employee Number + PIN |
| Casual workers | Employee Number + PIN if portal access is enabled |

## Employee PIN process

```text
HR creates employee profile
↓
System creates employee number
↓
HR enables portal access
↓
System generates temporary PIN
↓
Employee logs in
↓
First login forces PIN change
```
