export const STAFF_ROLES = [
  'ADMIN',
  'DIRECTOR',

  'FINANCE_MANAGER',
  'FINANCE_OFFICER',

  'HR_MANAGER',
  'HR_OFFICER',

  'LINE_MANAGER',
  'SUPERVISOR',

  'ASSET_MANAGER',
  'ASSET_OFFICER',

  'FLEET_MANAGER',
  'FLEET_DISPATCH_OFFICER',

  'PAYROLL_OFFICER',
  'PROCUREMENT_OFFICER',
  'STORES_OFFICER',

  'AUDITOR',
] as const;

export type StaffRole =
  (typeof STAFF_ROLES)[number];

const STAFF_ROLE_SET =
  new Set<string>(STAFF_ROLES);

/**
 * Convert a value into a valid Southin staff role.
 */
export function asStaffRole(
  value: unknown,
): StaffRole | null {
  if (!value) {
    return null;
  }

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');

  if (!STAFF_ROLE_SET.has(normalized)) {
    return null;
  }

  return normalized as StaffRole;
}

/**
 * Map Entra Security Group Object IDs
 * to Southin application roles.
 */
const GROUP_ROLE_ENTRIES:
  Array<[string | undefined, StaffRole]> = [
    [
      process.env.ENTRA_GROUP_ADMIN_ID,
      'ADMIN',
    ],

    [
      process.env.ENTRA_GROUP_DIRECTOR_ID,
      'DIRECTOR',
    ],

    [
      process.env.ENTRA_GROUP_FINANCE_MANAGER_ID,
      'FINANCE_MANAGER',
    ],

    [
      process.env.ENTRA_GROUP_FINANCE_OFFICER_ID,
      'FINANCE_OFFICER',
    ],

    [
      process.env.ENTRA_GROUP_HR_MANAGER_ID,
      'HR_MANAGER',
    ],

    [
      process.env.ENTRA_GROUP_HR_OFFICER_ID,
      'HR_OFFICER',
    ],

    [
      process.env.ENTRA_GROUP_LINE_MANAGER_ID,
      'LINE_MANAGER',
    ],

    [
      process.env.ENTRA_GROUP_SUPERVISOR_ID,
      'SUPERVISOR',
    ],

    [
      process.env.ENTRA_GROUP_ASSET_MANAGER_ID,
      'ASSET_MANAGER',
    ],

    [
      process.env.ENTRA_GROUP_ASSET_OFFICER_ID,
      'ASSET_OFFICER',
    ],

    [
      process.env.ENTRA_GROUP_FLEET_MANAGER_ID,
      'FLEET_MANAGER',
    ],

    [
      process.env.ENTRA_GROUP_FLEET_DISPATCH_ID,
      'FLEET_DISPATCH_OFFICER',
    ],

    [
      process.env.ENTRA_GROUP_PAYROLL_OFFICER_ID,
      'PAYROLL_OFFICER',
    ],

    [
      process.env
        .ENTRA_GROUP_PROCUREMENT_OFFICER_ID,
      'PROCUREMENT_OFFICER',
    ],

    [
      process.env.ENTRA_GROUP_STORES_OFFICER_ID,
      'STORES_OFFICER',
    ],

    [
      process.env.ENTRA_GROUP_AUDITOR_ID,
      'AUDITOR',
    ],
  ];

const GROUP_ROLE_MAP =
  new Map<string, StaffRole>(
    GROUP_ROLE_ENTRIES
      .filter(
        (
          entry,
        ): entry is [string, StaffRole] =>
          Boolean(entry[0]?.trim()),
      )
      .map(([groupId, role]) => [
        groupId.trim().toLowerCase(),
        role,
      ]),
  );

/**
 * Resolve ALL Southin roles from the
 * Entra groups claim.
 */
export function getRolesFromGroups(
  groups: unknown,
): StaffRole[] {
  if (!Array.isArray(groups)) {
    return [];
  }

  const roles = new Set<StaffRole>();

  for (const groupId of groups) {
    if (typeof groupId !== 'string') {
      continue;
    }

    const role = GROUP_ROLE_MAP.get(
      groupId.trim().toLowerCase(),
    );

    if (role) {
      roles.add(role);
    }
  }

  return [...roles];
}

/**
 * Bootstrap Admin is retained as an
 * emergency/initial administration path.
 */
export function getBootstrapAdminRole(
  email?: string | null,
): StaffRole | null {
  if (!email) {
    return null;
  }

  const bootstrapAdmins = String(
    process.env
      .SOUTHIN_BOOTSTRAP_ADMIN_EMAILS || '',
  )
    .split(',')
    .map((item) =>
      item.trim().toLowerCase(),
    )
    .filter(Boolean);

  return bootstrapAdmins.includes(
    email.trim().toLowerCase(),
  )
    ? 'ADMIN'
    : null;
}

/**
 * Combine any number of role values
 * without duplicates.
 */
export function mergeStaffRoles(
  ...values: unknown[]
): StaffRole[] {
  const roles =
    new Set<StaffRole>();

  const addValue = (
    value: unknown,
  ) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        addValue(item);
      }

      return;
    }

    const role =
      asStaffRole(value);

    if (role) {
      roles.add(role);
    }
  };

  for (const value of values) {
    addValue(value);
  }

  return [...roles];
}

/**
 * Keep one primary role for pages/code that
 * have not yet been migrated to staffRoles[].
 *
 * Existing primary role is preserved when valid.
 */
export function selectPrimaryRole(
  roles: StaffRole[],
  preferred?: unknown,
): StaffRole | null {
  if (!roles.length) {
    return null;
  }

  if (roles.includes('ADMIN')) {
    return 'ADMIN';
  }

  const preferredRole =
    asStaffRole(preferred);

  if (
    preferredRole &&
    roles.includes(preferredRole)
  ) {
    return preferredRole;
  }

  /**
   * Stable compatibility priority.
   */
  for (const role of STAFF_ROLES) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return roles[0] ?? null;
}

/**
 * Generic authorization helper for pages/components.
 */
export function hasAnyStaffRole(
  userRoles: unknown,
  allowedRoles: readonly StaffRole[],
): boolean {
  const roles =
    mergeStaffRoles(userRoles);

  if (roles.includes('ADMIN')) {
    return true;
  }

  return roles.some((role) =>
    allowedRoles.includes(role),
  );
}