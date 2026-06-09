import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export type AppRole =
  | 'ADMIN'
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'EMPLOYEE';

export const RequireRoles = (...roles: AppRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);