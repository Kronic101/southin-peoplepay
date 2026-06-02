# Southin PeoplePay Concept Note

## Purpose

Southin PeoplePay is a proposed HR and Payroll Management System for Southin Contracting Limited. It will manage employee records, employment types, temporary and casual workers, conditions of service, payroll processing, statutory payroll settings, approvals, payslips, and Executive Page dashboard reporting.

## Core objectives

1. Centralize employee records.
2. Manage permanent, fixed-term, temporary, casual, part-time, intern, and project-based workers.
3. Allow employees without Microsoft 365 accounts to access payslips using Employee Number and PIN.
4. Use Microsoft 365 authentication for HR, Finance, Directors, and management users.
5. Apply configurable conditions of service per employee.
6. Process payroll using configurable PAYE, NAPSA, NHIMA, SDL, and employer cost rules.
7. Enforce approval controls before payroll is locked.
8. Generate payslips and statutory reports.
9. Send approved dashboard/reporting data to the SharePoint Executive Page.
10. Maintain audit records for transparency and external audit review.

## Agreed payroll workflow

```text
Payroll Officer prepares payroll
↓
HR Manager checks employee changes and attendance
↓
Finance Manager checks totals, deductions, bank file
↓
Director approves
↓
Payroll locks
↓
Payslips generated
↓
SharePoint reports updated
```

## Important compliance principle

The payroll engine must not hard-code statutory rules. All statutory rates, thresholds, ceilings, contribution bases, and effective dates must be configurable and approved by HR/Finance before payroll goes live.
