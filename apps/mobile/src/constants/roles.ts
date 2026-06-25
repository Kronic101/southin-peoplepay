export const mobileRoles = {
  DRIVER: 'DRIVER',
  FLEET_DISPATCH: 'FLEET_DISPATCH',
  FLEET_MANAGER: 'FLEET_MANAGER',
  ASSET_FIELD_USER: 'ASSET_FIELD_USER',
  ASSET_MANAGER: 'ASSET_MANAGER',
  FINANCE: 'FINANCE',
  DIRECTOR: 'DIRECTOR',
  ADMIN: 'ADMIN',
} as const;

export type MobileRole = keyof typeof mobileRoles;