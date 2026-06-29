'use client';

import { useEffect, useState } from 'react';

import { isDemoEnabledForBrowser } from '@/lib/demo';
import {
  DEV_ROLE_LABELS,
  DEV_ROLES,
  DevRole,
  getDevRole,
  setDevRole,
} from '@/lib/dev-role';

export function DevRoleSelector() {
  const [demoVisible, setDemoVisible] = useState(false);
  const [role, setRole] = useState<DevRole>('ADMIN');

  useEffect(() => {
    const enabled = isDemoEnabledForBrowser();
    setDemoVisible(enabled);

    if (!enabled) {
      return;
    }

    setRole(getDevRole());

    const onRoleChanged = (event: Event) => {
      const customEvent = event as CustomEvent<DevRole>;
      setRole(customEvent.detail);
    };

    window.addEventListener('southin-dev-role-changed', onRoleChanged);

    return () => {
      window.removeEventListener('southin-dev-role-changed', onRoleChanged);
    };
  }, []);

  function handleChange(value: string) {
    const selectedRole = value as DevRole;
    setRole(selectedRole);
    setDevRole(selectedRole);
  }

  if (!demoVisible) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.6rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        background: '#fff7ed',
      }}
    >
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412' }}>
        Dev Role
      </span>

      <select
        value={role}
        onChange={(event) => handleChange(event.target.value)}
        style={{
          border: '1px solid #fed7aa',
          borderRadius: '0.5rem',
          padding: '0.35rem 0.5rem',
          fontWeight: 700,
          color: '#0f172a',
          background: 'white',
        }}
      >
        {DEV_ROLES.map((item) => (
          <option key={item} value={item}>
            {DEV_ROLE_LABELS[item]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DevRoleSelector;