'use client';

import { useEffect, useState } from 'react';
import {
  DEV_ROLE_LABELS,
  DEV_ROLES,
  DevRole,
  getDevRole,
  setDevRole,
} from '@/lib/dev-role';

export function FloatingDevRoleSelector() {
  const [role, setRole] = useState<DevRole>('ADMIN');

  useEffect(() => {
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

  return (
    <div
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.55rem 0.75rem',
        border: '1px solid #fed7aa',
        borderRadius: '0.85rem',
        background: '#fff7ed',
        boxShadow: '0 12px 35px rgba(15, 23, 42, 0.18)',
      }}
    >
      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a3412' }}>
        Dev Role
      </span>

      <select
        value={role}
        onChange={(event) => handleChange(event.target.value)}
        style={{
          border: '1px solid #fed7aa',
          borderRadius: '0.5rem',
          padding: '0.35rem 0.5rem',
          fontWeight: 800,
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