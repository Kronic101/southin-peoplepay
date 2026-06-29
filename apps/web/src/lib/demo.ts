export const demoEnabled = process.env.NEXT_PUBLIC_ALLOW_DEMO === 'true';

export function isDemoEnabled() {
  return demoEnabled;
}