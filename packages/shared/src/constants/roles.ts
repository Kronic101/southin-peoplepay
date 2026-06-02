export const SYSTEM_ROLES = [
  'Super Admin',
  'System Admin',
  'HR Officer',
  'HR Manager',
  'Payroll Officer',
  'Finance Officer',
  'Finance Manager',
  'Director',
  'Line Manager',
  'Employee',
  'Casual Worker',
  'Auditor'
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
