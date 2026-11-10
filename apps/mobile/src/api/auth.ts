import { apiPost } from './client';

export type MobileLoginPayload = {
  employeeNumber: string;
  pin: string;
};

export type MobileLoginResponse = {
  message: string;
  token: string;
  mustChangePin: boolean;
  accessProfile: string;
  allowedModules: string[];
  employee: any;
};

export type MobileChangePinPayload = {
  employeeNumber: string;
  currentPin: string;
  newPin: string;
};

export type MobileChangePinResponse = {
  message: string;
  token: string;
  mustChangePin: boolean;
  employee: any;
};

export async function mobileLogin(
  payload: MobileLoginPayload,
) {
  return apiPost<MobileLoginResponse>(
    '/auth/employee/login',
    payload,
  );
}

export async function mobileChangePin(
  payload: MobileChangePinPayload,
) {
  return apiPost<MobileChangePinResponse>(
    '/auth/employee/change-pin',
    payload,
  );
}