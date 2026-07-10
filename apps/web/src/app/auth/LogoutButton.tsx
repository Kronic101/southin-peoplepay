'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const localStorageKeys = [
        'southin_dev_role',
        'southin_staff_role',
        'southin_employee_session',
        'southin_employee_token',
        'employeePortalSession',
        'employeeToken',
      ];

      for (const key of localStorageKeys) {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      }

      await signOut({
        callbackUrl: '/',
        redirect: true,
      });
    } catch {
      window.location.href = '/';
    }
  }

  return (
    <button
      type="button"
      className="sidebar-logout-button"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}