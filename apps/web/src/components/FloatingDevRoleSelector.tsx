'use client';

import { useEffect, useState } from 'react';

import { isDemoEnabledForBrowser } from '@/lib/demo';

type DevRole =
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'ADMIN'
  | 'LINE_MANAGER'
  | 'SUPERVISOR'
  | 'ASSET_MANAGER'
  | 'STORES_OFFICER'
  | 'FLEET_MANAGER'
  | 'FLEET_DISPATCH_OFFICER';

const roleOptions: { label: string; value: DevRole }[] = [
  { label: 'Payroll', value: 'PAYROLL_OFFICER' },
  { label: 'HR', value: 'HR_MANAGER' },
  { label: 'Finance', value: 'FINANCE_MANAGER' },
  { label: 'Director', value: 'DIRECTOR' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Line Mgr', value: 'LINE_MANAGER' },
  { label: 'Supervisor', value: 'SUPERVISOR' },
  { label: 'Asset Mgr', value: 'ASSET_MANAGER' },
  { label: 'Stores', value: 'STORES_OFFICER' },
  { label: 'Fleet Mgr', value: 'FLEET_MANAGER' },
  { label: 'Dispatch', value: 'FLEET_DISPATCH_OFFICER' },
];

const ROLE_KEYS = ['southinDevRole', 'southin-dev-role', 'devRole', 'role', 'x-user-role'];

function getStoredRole(): DevRole {
  if (typeof window === 'undefined') return 'ADMIN';

  const stored =
    localStorage.getItem('southinDevRole') ||
    localStorage.getItem('southin-dev-role') ||
    localStorage.getItem('devRole') ||
    localStorage.getItem('role') ||
    localStorage.getItem('x-user-role');

  return (stored || 'ADMIN') as DevRole;
}

function saveRole(role: DevRole) {
  if (typeof window === 'undefined') return;

  ROLE_KEYS.forEach((key) => localStorage.setItem(key, role));
}

export function FloatingDevRoleSelector() {
  const [demoVisible, setDemoVisible] = useState(false);
  const [role, setRole] = useState<DevRole>('ADMIN');

  useEffect(() => {
    const enabled = isDemoEnabledForBrowser();
    setDemoVisible(enabled);

    if (!enabled) {
      return;
    }

    const currentRole = getStoredRole();
    setRole(currentRole);
    saveRole(currentRole);
  }, []);

  function handleChange(nextRole: DevRole) {
    setRole(nextRole);
    saveRole(nextRole);
    window.dispatchEvent(new Event('storage'));
  }

  if (!demoVisible) {
    return null;
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