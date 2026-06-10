import { DevRole } from './dev-role';

export function isAdmin(role?: DevRole | string | null) {
  return role === 'ADMIN';
}

export function hasAnyRole(role: DevRole | string | null | undefined, allowedRoles: string[]) {
  if (!role) return false;
  return role === 'ADMIN' || allowedRoles.includes(role);
}

export function canAccessPayrollOfficerAction(role?: DevRole | string | null) {
  return hasAnyRole(role, ['PAYROLL_OFFICER']);
}

export function canAccessHrAction(role?: DevRole | string | null) {
  return hasAnyRole(role, ['HR_MANAGER']);
}

export function canAccessFinanceAction(role?: DevRole | string | null) {
  return hasAnyRole(role, ['FINANCE_MANAGER']);
}

export function canAccessDirectorAction(role?: DevRole | string | null) {
  return hasAnyRole(role, ['DIRECTOR']);
}

export function canViewPayrollEvidence(role?: DevRole | string | null) {
  return hasAnyRole(role, [
    'PAYROLL_OFFICER',
    'HR_MANAGER',
    'FINANCE_MANAGER',
    'DIRECTOR',
  ]);
}

export function payrollStatus(value?: string | null) {
  return String(value || '').toUpperCase();
}

export function isPayrollLocked(value?: string | null) {
  return payrollStatus(value) === 'LOCKED';
}

export function isPayrollOpen(value?: string | null) {
  return ['OPEN', 'DRAFT'].includes(payrollStatus(value));
}