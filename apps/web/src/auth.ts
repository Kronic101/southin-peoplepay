import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

type StaffRole =
  | "ADMIN"
  | "DIRECTOR"
  | "FINANCE_MANAGER"
  | "FINANCE_OFFICER"
  | "HR_MANAGER"
  | "HR_OFFICER"
  | "LINE_MANAGER"
  | "SUPERVISOR"
  | "ASSET_MANAGER"
  | "ASSET_OFFICER"
  | "FLEET_MANAGER"
  | "FLEET_DISPATCH_OFFICER"
  | "PAYROLL_OFFICER"
  | "PROCUREMENT_OFFICER"
  | "STORES_OFFICER"
  | "AUDITOR";

function decodeJwtPayload(jwt?: string | null): any {
  if (!jwt) return null;

  try {
    const payload = jwt.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = Buffer.from(normalized, "base64").toString("utf8");

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Build the mapping only from environment variables
 * that actually contain a group ID.
 *
 * GUID comparison is normalised to lowercase.
 */
const groupRoleEntries: Array<[string | undefined, StaffRole]> = [
  [process.env.ENTRA_GROUP_ADMIN_ID, "ADMIN"],
  [process.env.ENTRA_GROUP_DIRECTOR_ID, "DIRECTOR"],

  [process.env.ENTRA_GROUP_FINANCE_MANAGER_ID, "FINANCE_MANAGER"],
  [process.env.ENTRA_GROUP_FINANCE_OFFICER_ID, "FINANCE_OFFICER"],

  [process.env.ENTRA_GROUP_HR_MANAGER_ID, "HR_MANAGER"],
  [process.env.ENTRA_GROUP_HR_OFFICER_ID, "HR_OFFICER"],

  [process.env.ENTRA_GROUP_LINE_MANAGER_ID, "LINE_MANAGER"],
  [process.env.ENTRA_GROUP_SUPERVISOR_ID, "SUPERVISOR"],

  [process.env.ENTRA_GROUP_ASSET_MANAGER_ID, "ASSET_MANAGER"],
  [process.env.ENTRA_GROUP_ASSET_OFFICER_ID, "ASSET_OFFICER"],

  [process.env.ENTRA_GROUP_FLEET_MANAGER_ID, "FLEET_MANAGER"],
  [process.env.ENTRA_GROUP_FLEET_DISPATCH_ID, "FLEET_DISPATCH_OFFICER"],

  [process.env.ENTRA_GROUP_PAYROLL_OFFICER_ID, "PAYROLL_OFFICER"],

  [process.env.ENTRA_GROUP_PROCUREMENT_OFFICER_ID, "PROCUREMENT_OFFICER"],

  [process.env.ENTRA_GROUP_STORES_OFFICER_ID, "STORES_OFFICER"],

  [process.env.ENTRA_GROUP_AUDITOR_ID, "AUDITOR"],
];

const groupRoleMap = new Map<string, StaffRole>(
  groupRoleEntries
    .filter(
      (entry): entry is [string, StaffRole] =>
        Boolean(entry[0]?.trim())
    )
    .map(([groupId, role]) => [
      groupId.trim().toLowerCase(),
      role,
    ])
);

function getRoleFromGroups(groups: unknown): StaffRole | null {
  if (!Array.isArray(groups)) {
    return null;
  }

  for (const groupId of groups) {
    if (typeof groupId !== "string") {
      continue;
    }

    const normalizedGroupId = groupId.trim().toLowerCase();

    const role = groupRoleMap.get(normalizedGroupId);

    if (role) {
      return role;
    }
  }

  return null;
}

function getBootstrapAdminRole(
  email?: string | null
): StaffRole | null {
  if (!email) {
    return null;
  }

  const bootstrapAdmins = String(
    process.env.SOUTHIN_BOOTSTRAP_ADMIN_EMAILS || ""
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return bootstrapAdmins.includes(email.toLowerCase())
    ? "ADMIN"
    : null;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,

      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, profile, account }) {
      /**
       * IMPORTANT:
       *
       * account/profile are normally available only during
       * the initial OAuth sign-in.
       *
       * Do NOT overwrite entraGroups/staffRole with []
       * during later session callbacks.
       */
      if (account || profile) {
        const profileClaims = (profile ?? {}) as any;

        const idTokenClaims =
          decodeJwtPayload(account?.id_token) ?? {};

        const claims = {
          ...profileClaims,
          ...idTokenClaims,
        };

        const groups = Array.isArray(claims?.groups)
          ? claims.groups.filter(
              (groupId: unknown): groupId is string =>
                typeof groupId === "string"
            )
          : [];

        const email =
          token.email ??
          claims?.preferred_username ??
          claims?.email ??
          claims?.upn ??
          null;

        const entraObjectId =
          claims?.oid ??
          profileClaims?.oid ??
          token.sub ??
          null;

        const roleFromGroups =
          getRoleFromGroups(groups);

        const roleFromBootstrap =
          getBootstrapAdminRole(email);

        token.email = email;
        token.entraObjectId = entraObjectId;

        /**
         * Persist the values into the NextAuth JWT.
         */
        token.entraGroups = groups;

        token.staffRole =
          roleFromGroups ??
          roleFromBootstrap ??
          null;

        token.name =
          token.name ??
          claims?.name ??
          null;

        /**
         * Optional diagnostic value.
         *
         * If true, Microsoft didn't put groups into the
         * token because of group overage.
         */
        token.entraGroupOverage = Boolean(
          claims?._claim_names?.groups ||
          claims?.hasgroups
        );
      }

      /**
       * On subsequent callbacks account/profile are absent.
       *
       * The existing values in token are intentionally
       * preserved.
       */

      if (!token.staffRole && token.email) {
        const bootstrapRole =
          getBootstrapAdminRole(token.email);

        if (bootstrapRole) {
          token.staffRole = bootstrapRole;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email =
          token.email ?? session.user.email;

        session.user.name =
          token.name ?? session.user.name;

        (session.user as any).entraObjectId =
          token.entraObjectId ?? null;

        (session.user as any).entraGroups =
          token.entraGroups ?? [];

        (session.user as any).staffRole =
          token.staffRole ?? null;

        (session.user as any).entraGroupOverage =
          token.entraGroupOverage ?? false;
      }

      return session;
    },
  },
};8