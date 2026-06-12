'use client';

import { useEffect, useState } from 'react';

type DevRole =
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'ADMIN'
  | 'LINE_MANAGER'
  | 'SUPERVISOR';

const roleOptions: { label: string; value: DevRole }[] = [
  { label: 'Payroll', value: 'PAYROLL_OFFICER' },
  { label: 'HR', value: 'HR_MANAGER' },
  { label: 'Finance', value: 'FINANCE_MANAGER' },
  { label: 'Director', value: 'DIRECTOR' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Line Mgr', value: 'LINE_MANAGER' },
  { label: 'Supervisor', value: 'SUPERVISOR' },
];

const ROLE_KEYS = ['southinDevRole', 'southin-dev-role', 'devRole', 'role', 'x-user-role'];

function getStoredRole(): DevRole {
  if (typeof window === 'undefined') return 'PAYROLL_OFFICER';

  const stored =
    localStorage.getItem('southinDevRole') ||
    localStorage.getItem('southin-dev-role') ||
    localStorage.getItem('devRole') ||
    localStorage.getItem('role') ||
    localStorage.getItem('x-user-role');

  return (stored || 'PAYROLL_OFFICER') as DevRole;
}

function saveRole(role: DevRole) {
  if (typeof window === 'undefined') return;

  ROLE_KEYS.forEach((key) => localStorage.setItem(key, role));
}

export function FloatingDevRoleSelector() {
  const [role, setRole] = useState<DevRole>('PAYROLL_OFFICER');

  useEffect(() => {
    const currentRole = getStoredRole();
    setRole(currentRole);
    saveRole(currentRole);
  }, []);

  function handleChange(nextRole: DevRole) {
    setRole(nextRole);
    saveRole(nextRole);
    window.dispatchEvent(new Event('storage'));
  }

  return (
    <div className="floating-dev-role-selector compact">
      <span>Dev Role</span>

      <select value={role} onChange={(event) => handleChange(event.target.value as DevRole)}>
        {roleOptions.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FloatingDevRoleSelector;