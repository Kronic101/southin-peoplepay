import type {
  NextAuthOptions,
} from 'next-auth';

import AzureADProvider from
  'next-auth/providers/azure-ad';

import {
  getBootstrapAdminRole,
  getRolesFromGroups,
  mergeStaffRoles,
  selectPrimaryRole,
} from '@/lib/staff-roles';

function decodeJwtPayload(
  jwt?: string | null,
): any {
  if (!jwt) {
    return null;
  }

  try {
    const payload =
      jwt.split('.')[1];

    if (!payload) {
      return null;
    }

    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const decoded =
      Buffer.from(
        normalized,
        'base64',
      ).toString('utf8');

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export const authOptions:
  NextAuthOptions = {
    secret:
      process.env.NEXTAUTH_SECRET,

    session: {
      strategy: 'jwt',
    },

    providers: [
      AzureADProvider({
        clientId:
          process.env
            .AZURE_AD_CLIENT_ID!,

        clientSecret:
          process.env
            .AZURE_AD_CLIENT_SECRET!,

        tenantId:
          process.env
            .AZURE_AD_TENANT_ID!,

        authorization: {
          params: {
            scope:
              'openid profile email User.Read',
          },
        },
      }),
    ],

    callbacks: {
      async jwt({
        token,
        profile,
        account,
      }) {
        /**
         * account/profile are normally
         * available during the initial
         * Entra OAuth authentication.
         */
        if (account || profile) {
          const profileClaims =
            (profile ?? {}) as any;

          const idTokenClaims =
            decodeJwtPayload(
              account?.id_token,
            ) ?? {};

          const claims = {
            ...profileClaims,
            ...idTokenClaims,
          };

          const groups =
            Array.isArray(
              claims?.groups,
            )
              ? claims.groups.filter(
                  (
                    groupId: unknown,
                  ): groupId is string =>
                    typeof groupId ===
                    'string',
                )
              : [];

          const email =
            token.email ??
            claims
              ?.preferred_username ??
            claims?.email ??
            claims?.upn ??
            null;

          const entraObjectId =
            claims?.oid ??
            profileClaims?.oid ??
            token.sub ??
            null;

          /**
           * IMPORTANT:
           *
           * Resolve ALL Entra groups into
           * application roles.
           */
          const rolesFromGroups =
            getRolesFromGroups(
              groups,
            );

          const bootstrapRole =
            getBootstrapAdminRole(
              email,
            );

          const staffRoles =
            mergeStaffRoles(
              rolesFromGroups,
              bootstrapRole,
            );

          token.email =
            email;

          token.entraObjectId =
            entraObjectId;

          token.entraGroups =
            groups;

          /**
           * NEW:
           * persist every valid role.
           */
          token.staffRoles =
            staffRoles;

          /**
           * Legacy compatibility:
           * keep one primary role.
           */
          token.staffRole =
            selectPrimaryRole(
              staffRoles,
              token.staffRole,
            );

          token.name =
            token.name ??
            claims?.name ??
            null;

          token.entraGroupOverage =
            Boolean(
              claims
                ?._claim_names
                ?.groups ||
                claims?.hasgroups,
            );
        } else {
          /**
           * Subsequent JWT callbacks.
           *
           * Microsoft profile/account are
           * no longer supplied, therefore
           * reconstruct the authorization
           * context from the values already
           * persisted inside the JWT.
           */

          const rolesFromStoredGroups =
            getRolesFromGroups(
              token.entraGroups,
            );

          const bootstrapRole =
            getBootstrapAdminRole(
              token.email,
            );

          const staffRoles =
            mergeStaffRoles(
              rolesFromStoredGroups,
              bootstrapRole,
              token.staffRoles,
              token.staffRole,
            );

          token.staffRoles =
            staffRoles;

          token.staffRole =
            selectPrimaryRole(
              staffRoles,
              token.staffRole,
            );
        }

        return token;
      },

      async session({
        session,
        token,
      }) {
        if (!session.user) {
          return session;
        }

        /**
         * Reconstruct once more as a
         * defensive compatibility step.
         */
        const staffRoles =
          mergeStaffRoles(
            token.staffRoles,

            getRolesFromGroups(
              token.entraGroups,
            ),

            token.staffRole,
          );

        session.user.email =
          token.email ??
          session.user.email;

        session.user.name =
          token.name ??
          session.user.name;

        session.user.entraObjectId =
          token.entraObjectId ??
          null;

        session.user.entraGroups =
          Array.isArray(
            token.entraGroups,
          )
            ? token.entraGroups
            : [];

        /**
         * Primary/legacy role.
         */
        session.user.staffRole =
          selectPrimaryRole(
            staffRoles,
            token.staffRole,
          );

        /**
         * NEW:
         * complete role list.
         */
        session.user.staffRoles =
          staffRoles;

        session.user
          .entraGroupOverage =
          Boolean(
            token
              .entraGroupOverage,
          );

        return session;
      },
    },
  };