import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  mobileChangePin,
  mobileLogin,
} from '../api/auth';

import { env } from '../config/env';

import {
  MobileSession,
  clearSession,
  getSession,
  saveSession,
} from '../storage/session';

function employeeDisplayName(
  employee: any,
  fallback: string,
) {
  const name = [
    employee?.firstName,
    employee?.middleName,
    employee?.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || fallback;
}

export function useAuth() {
  const [session, setSession] =
    useState<MobileSession | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const loadSession =
    useCallback(async () => {
      setLoading(true);

      try {
        const current =
          await getSession();

        setSession(current);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function login(
    employeeNo: string,
    pin: string,
  ) {
    const cleanEmployeeNo =
      employeeNo
        .trim()
        .toUpperCase();

    try {
      const response =
        await mobileLogin({
          employeeNumber:
            cleanEmployeeNo,

          pin: pin.trim(),
        });

      const employee =
        response.employee || {};

      const displayName =
        employeeDisplayName(
          employee,
          cleanEmployeeNo,
        );

      const nextSession:
        MobileSession = {
        token:
          response.token,

        userId:
          employee.id || null,

        employeeId:
          employee.id || null,

        employeeNo:
          employee.employeeNumber ||
          cleanEmployeeNo,

        displayName,
        name: displayName,

        role:
          response.accessProfile ||
          'EMPLOYEE',

        accessProfile:
          response.accessProfile ||
          'EMPLOYEE',

        allowedModules:
          Array.isArray(
            response.allowedModules,
          )
            ? response.allowedModules
            : [],

        mustChangePin:
          Boolean(
            response.mustChangePin,
          ),
      };

      await saveSession(
        nextSession,
      );

      setSession(
        nextSession,
      );

      return nextSession;
    } catch (error) {
      /*
       * Development fallback only.
       *
       * This must be disabled in APK
       * UAT / production.
       */
      if (!env.allowDevLogin) {
        throw error;
      }

      const devSession:
        MobileSession = {
        token: null,

        employeeNo:
          cleanEmployeeNo,

        displayName:
          cleanEmployeeNo ||
          'Mobile User',

        name:
          cleanEmployeeNo ||
          'Mobile User',

        role: 'DRIVER',

        accessProfile:
          'DRIVER',

        allowedModules: [],

        mustChangePin:
          false,
      };

      await saveSession(
        devSession,
      );

      setSession(
        devSession,
      );

      return devSession;
    }
  }

  async function changePin(
    employeeNo: string,
    currentPin: string,
    newPin: string,
  ) {
    const cleanEmployeeNo =
      employeeNo
        .trim()
        .toUpperCase();

    const response =
      await mobileChangePin({
        employeeNumber:
          cleanEmployeeNo,

        currentPin:
          currentPin.trim(),

        newPin:
          newPin.trim(),
      });

    const current =
      await getSession();

    const employee =
      response.employee || {};

    const displayName =
      employeeDisplayName(
        employee,
        current?.displayName ||
          cleanEmployeeNo,
      );

    const nextSession:
      MobileSession = {
      ...(current || {}),

      token:
        response.token,

      userId:
        employee.id ||
        current?.userId ||
        null,

      employeeId:
        employee.id ||
        current?.employeeId ||
        null,

      employeeNo:
        employee.employeeNumber ||
        current?.employeeNo ||
        cleanEmployeeNo,

      name:
        displayName,

      displayName,

      mustChangePin:
        false,
    };

    await saveSession(
      nextSession,
    );

    setSession(
      nextSession,
    );

    return nextSession;
  }

  async function logout() {
    await clearSession();

    setSession(null);
  }

  return {
    session,
    loading,
    login,
    changePin,
    logout,
    reload:
      loadSession,
  };
}