import { apiPost } from './client';
import { MobileSession } from '../storage/session';

export type MobileLoginPayload = {
  employeeNo: string;
  pin: string;
};

export async function mobileLogin(payload: MobileLoginPayload) {
  return apiPost<MobileSession>('/auth/mobile-login', payload);
}