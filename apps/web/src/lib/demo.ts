const allowDemo = process.env.NEXT_PUBLIC_ALLOW_DEMO === 'true';
const appEnv = String(process.env.NEXT_PUBLIC_APP_ENV || '').toLowerCase();

export const demoEnabled = allowDemo && appEnv !== 'production';

export function isDemoEnabledForBrowser() {
  if (!demoEnabled) {
    return false;
  }

  if (typeof window === 'undefined') {
    return demoEnabled;
  }

  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes('railway.app')) {
    return false;
  }

  if (hostname === 'southinweb-production.up.railway.app') {
    return false;
  }

  return true;
}