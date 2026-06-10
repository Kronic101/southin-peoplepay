'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DevRole, getDevRole, setDevRole } from '@/lib/dev-role';

const roles: DevRole[] = [
  'PAYROLL_OFFICER',
  'HR_MANAGER',
  'FINANCE_MANAGER',
  'DIRECTOR',
  'ADMIN',
];

const roleLabels: Record<DevRole, string> = {
  PAYROLL_OFFICER: 'Payroll Officer',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
};

export default function FloatingDevRoleSelector() {
  const pathname = usePathname();
  const [role, setRoleState] = useState<DevRole>('PAYROLL_OFFICER');

  useEffect(() => {
    setRoleState(getDevRole());
  }, []);

  if (
    pathname === '/' ||
    pathname?.startsWith('/me') ||
    pathname?.startsWith('/employee-login') ||
    pathname?.startsWith('/employee-change-pin') ||
    pathname?.startsWith('/forgot-pin')
  ) {
    return null;
  }

  function handleChange(nextRole: DevRole) {
    setDevRole(nextRole);
    setRoleState(nextRole);
    window.location.reload();
  }

  return (
    <div className="floating-role-selector">
      <span>Dev Role</span>

      <select value={role} onChange={(event) => handleChange(event.target.value as DevRole)}>
        {roles.map((item) => (
          <option key={item} value={item}>
            {roleLabels[item]}
          </option>
        ))}
      </select>
    </div>
  );
}