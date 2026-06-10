export type WorkbenchRole =
  | 'ADMIN'
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'EMPLOYEE';

export function getRoleHomePath(role?: string | null) {
  switch (role) {
    case 'EMPLOYEE':
      return '/me';

    case 'HR_MANAGER':
      return '/hr/dashboard';

    case 'FINANCE_MANAGER':
      return '/finance/dashboard';

    case 'PAYROLL_OFFICER':
      return '/payroll';

    case 'DIRECTOR':
      return '/executive/dashboard';

    case 'ADMIN':
      return '/admin';

    default:
      return '/workbench';
  }
}

export function getRoleLabel(role?: string | null) {
  switch (role) {
    case 'EMPLOYEE':
      return 'Employee Self-Service';

    case 'HR_MANAGER':
      return 'Human Resources';

    case 'FINANCE_MANAGER':
      return 'Finance';

    case 'PAYROLL_OFFICER':
      return 'Payroll Office';

    case 'DIRECTOR':
      return 'Director / Executive';

    case 'ADMIN':
      return 'System Administration';

    default:
      return 'Southin PeoplePay';
  }
}