import type {
  DefaultSession,
} from 'next-auth';

import type {
  StaffRole,
} from '../lib/staff-roles';

declare module 'next-auth' {
  interface Session {
    user: {
      entraObjectId?:
        | string
        | null;

      entraGroups?: string[];

      /**
       * Primary role retained for
       * backward compatibility.
       */
      staffRole?:
        | StaffRole
        | null;

      /**
       * NEW:
       * all applicable roles.
       */
      staffRoles?: StaffRole[];

      entraGroupOverage?:
        boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    entraObjectId?:
      | string
      | null;

    entraGroups?: string[];

    staffRole?:
      | StaffRole
      | null;

    staffRoles?: StaffRole[];

    entraGroupOverage?:
      boolean;
  }
}