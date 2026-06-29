import AsyncStorage from '@react-native-async-storage/async-storage';

const DRIVER_PROFILE_KEY = 'southin_mobile_driver_profile_v1';

export type DriverProfile = {
  driverName: string;
  employeeNo: string;
  drivingPermitNo: string;
  phone: string;
  role: string;
  site: string;
  department: string;
  updatedAt?: string;
};

export const defaultDriverProfile: DriverProfile = {
  driverName: 'Fleet Driver',
  employeeNo: '',
  drivingPermitNo: '',
  phone: '',
  role: 'DRIVER',
  site: 'Kitwe Main Distribution Centre',
  department: 'Operations',
};

export async function getDriverProfile(): Promise<DriverProfile> {
  const raw = await AsyncStorage.getItem(DRIVER_PROFILE_KEY);

  if (!raw) {
    return defaultDriverProfile;
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      ...defaultDriverProfile,
      ...parsed,
    };
  } catch {
    return defaultDriverProfile;
  }
}

export async function saveDriverProfile(profile: DriverProfile) {
  const payload: DriverProfile = {
    ...defaultDriverProfile,
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(payload));

  return payload;
}

export async function clearDriverProfile() {
  await AsyncStorage.removeItem(DRIVER_PROFILE_KEY);
}