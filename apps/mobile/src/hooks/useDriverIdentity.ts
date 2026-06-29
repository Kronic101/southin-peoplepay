import { useCallback, useEffect, useState } from 'react';

import { DriverProfile, defaultDriverProfile, getDriverProfile } from '../storage/driverProfile';
import { getSession } from '../storage/session';

export type MobileDriverIdentity = {
  driverName: string;
  employeeNo: string;
  employeeNumber: string;
  drivingPermitNo: string;
  phone: string;
  role: string;
  site: string;
  department: string;
  submittedBy: string;
  token?: string | null;
};

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function buildIdentity(profile: DriverProfile, session: any): MobileDriverIdentity {
  const sessionName =
    clean(session?.displayName) ||
    clean(session?.name) ||
    clean(session?.driverName) ||
    clean(session?.user?.displayName) ||
    clean(session?.user?.name);

  const sessionEmployeeNo =
    clean(session?.employeeNo) ||
    clean(session?.employeeNumber) ||
    clean(session?.user?.employeeNo) ||
    clean(session?.user?.employeeNumber);

  const driverName = sessionName || clean(profile.driverName) || defaultDriverProfile.driverName;
  const employeeNo = sessionEmployeeNo || clean(profile.employeeNo);

  return {
    driverName,
    employeeNo,
    employeeNumber: employeeNo,
    drivingPermitNo:
      clean(session?.drivingPermitNo) ||
      clean(session?.permitNo) ||
      clean(session?.user?.drivingPermitNo) ||
      clean(session?.user?.permitNo) ||
      clean(profile.drivingPermitNo),
    phone: clean(session?.phone) || clean(session?.user?.phone) || clean(profile.phone),
    role: clean(session?.role) || clean(session?.user?.role) || clean(profile.role) || 'DRIVER',
    site:
      clean(session?.site) ||
      clean(session?.user?.site) ||
      clean(profile.site) ||
      'Kitwe Main Distribution Centre',
    department:
      clean(session?.department) ||
      clean(session?.user?.department) ||
      clean(profile.department) ||
      'Operations',
    submittedBy: driverName,
    token: session?.token || null,
  };
}

export function useDriverIdentity() {
  const [identity, setIdentity] = useState<MobileDriverIdentity>(
    buildIdentity(defaultDriverProfile, null),
  );
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  const refreshIdentity = useCallback(async () => {
    setLoadingIdentity(true);

    try {
      const [profile, session] = await Promise.all([
        getDriverProfile(),
        getSession().catch(() => null),
      ]);

      const nextIdentity = buildIdentity(profile, session);
      setIdentity(nextIdentity);

      return nextIdentity;
    } finally {
      setLoadingIdentity(false);
    }
  }, []);

  useEffect(() => {
    refreshIdentity();
  }, [refreshIdentity]);

  return {
    identity,
    loadingIdentity,
    refreshIdentity,
  };
}
