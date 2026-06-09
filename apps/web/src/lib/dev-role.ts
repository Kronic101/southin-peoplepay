export type DevRole =
  | 'ADMIN'
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'EMPLOYEE';

export const DEV_ROLE_STORAGE_KEY = 'southin_peoplepay_dev_role';

export const DEV_ROLES: DevRole[] = [
  'ADMIN',
  'PAYROLL_OFFICER',
  'HR_MANAGER',
  'FINANCE_MANAGER',
  'DIRECTOR',
  'EMPLOYEE',
];

export const DEV_ROLE_LABELS: Record<DevRole, string> = {
  ADMIN: 'Admin',
  PAYROLL_OFFICER: 'Payroll Officer',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  DIRECTOR: 'Director',
  EMPLOYEE: 'Employee',
};

export function isDevRole(value: unknown): value is DevRole {
  return typeof value === 'string' && DEV_ROLES.includes(value as DevRole);
}

export function getDevRole(): DevRole {
  if (typeof window === 'undefined') {
    return 'ADMIN';
  }

  const storedRole = window.localStorage.getItem(DEV_ROLE_STORAGE_KEY);

  if (isDevRole(storedRole)) {
    return storedRole;
  }

  window.localStorage.setItem(DEV_ROLE_STORAGE_KEY, 'ADMIN');
  return 'ADMIN';
}

export function setDevRole(role: DevRole) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DEV_ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new CustomEvent('southin-dev-role-changed', { detail: role }));
}

export function getDevRoleHeaders(): HeadersInit {
  const role = getDevRole();

  return {
    'x-user-role': role,
  };
}

export function withDevRoleHeaders(headers?: HeadersInit): HeadersInit {
  return {
    ...(headers || {}),
    ...getDevRoleHeaders(),
  };
}