export const PAYROLL_STATUSES = [
  'Open',
  'Processing',
  'Submitted for HR Review',
  'HR Reviewed',
  'Submitted for Finance Review',
  'Finance Reviewed',
  'Submitted for Director Approval',
  'Director Approved',
  'Locked',
  'Closed',
  'Rejected'
] as const;

export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];
