# Database Design Summary

The database will be PostgreSQL hosted on Supabase. Prisma will manage the schema and migrations.

## Core table groups

### Security

- users
- roles
- permissions
- user_roles
- role_permissions
- employee_portal_accounts
- login_audit_logs
- audit_logs

### HR

- employees
- employee_contacts
- employee_bank_accounts
- employee_statutory_details
- departments
- job_titles
- sites
- projects
- employment_types
- employee_documents
- employee_status_history

### Contracts

- contract_types
- employee_contracts
- contract_documents

### Conditions of service

- service_condition_templates
- service_condition_components
- employee_service_conditions
- employee_condition_overrides

### Attendance and leave

- attendance_records
- timesheets
- timesheet_lines
- overtime_claims
- leave_types
- leave_requests
- leave_balances

### Payroll

- payroll_periods
- payroll_runs
- payroll_run_employees
- payroll_earnings
- payroll_deductions
- payroll_employer_costs
- payroll_adjustments
- payroll_approvals
- payroll_locks
- payslips
- bank_payment_files

### Statutory

- tax_years
- paye_bands
- napsa_rates
- nhima_rates
- sdl_rates
- workers_compensation_rates
- statutory_submissions
- statutory_submission_lines

### Integration and dashboards

- dashboard_snapshots
- sharepoint_publish_logs
- integration_settings
- integration_logs
- notification_logs
