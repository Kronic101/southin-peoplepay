import { useCallback, useEffect, useState } from 'react';

import { mobileLogin } from '../api/auth';
import { env } from '../config/env';
import {
  MobileSession,
  clearSession,
  getSession,
  saveSession,
} from '../storage/session';

export function useAuth() {
  const [session, setSession] = useState<MobileSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);

    try {
      const current = await getSession();
      setSession(current);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function login(employeeNo: string, pin: string) {
    try {
      const response = await mobileLogin({ employeeNo, pin });
      await saveSession(response);
      setSession(response);
      return response;
    } catch (error) {
      if (!env.allowDevLogin) {
        throw error;
      }

      const devSession: MobileSession = {
        token: null,
        employeeNo,
        displayName: employeeNo || 'Mobile User',
        role: 'DRIVER',
      };

      await saveSession(devSession);
      setSession(devSession);
      return devSession;
    }
  }

  async function logout() {
    await clearSession();
    setSession(null);
  }

  return {
    session,
    loading,
    login,
    logout,
    reload: loadSession,
  };
}