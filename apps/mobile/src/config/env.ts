export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_URL ||
    'http://172.20.10.3:4000/api',

  allowDevLogin:
    process.env.EXPO_PUBLIC_ALLOW_DEV_LOGIN !== 'false',
};

export const API_BASE_URL = env.apiBaseUrl;
export const APP_NAME = 'Southin Operations Hub Mobile';
export const IS_DEV = __DEV__;