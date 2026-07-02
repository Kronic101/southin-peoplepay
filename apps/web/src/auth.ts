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
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

const groupRoleMap: Record<string, StaffRole> = {
  [process.env.ENTRA_GROUP_ADMIN_ID ?? ""]: "ADMIN",
  [process.env.ENTRA_GROUP_DIRECTOR_ID ?? ""]: "DIRECTOR",
  [process.env.ENTRA_GROUP_FINANCE_MANAGER_ID ?? ""]: "FINANCE_MANAGER",
  [process.env.ENTRA_GROUP_FINANCE_OFFICER_ID ?? ""]: "FINANCE_OFFICER",
  [process.env.ENTRA_GROUP_HR_MANAGER_ID ?? ""]: "HR_MANAGER",
  [process.env.ENTRA_GROUP_HR_OFFICER_ID ?? ""]: "HR_OFFICER",
  [process.env.ENTRA_GROUP_LINE_MANAGER_ID ?? ""]: "LINE_MANAGER",
  [process.env.ENTRA_GROUP_SUPERVISOR_ID ?? ""]: "SUPERVISOR",
  [process.env.ENTRA_GROUP_ASSET_MANAGER_ID ?? ""]: "ASSET_MANAGER",
  [process.env.ENTRA_GROUP_ASSET_OFFICER_ID ?? ""]: "ASSET_OFFICER",
  [process.env.ENTRA_GROUP_FLEET_MANAGER_ID ?? ""]: "FLEET_MANAGER",
  [process.env.ENTRA_GROUP_FLEET_DISPATCH_ID ?? ""]: "FLEET_DISPATCH_OFFICER",
  [process.env.ENTRA_GROUP_PAYROLL_OFFICER_ID ?? ""]: "PAYROLL_OFFICER",
  [process.env.ENTRA_GROUP_PROCUREMENT_OFFICER_ID ?? ""]: "PROCUREMENT_OFFICER",
  [process.env.ENTRA_GROUP_STORES_OFFICER_ID ?? ""]: "STORES_OFFICER",
  [process.env.ENTRA_GROUP_AUDITOR_ID ?? ""]: "AUDITOR",
};

function getRoleFromGroups(groups: unknown): StaffRole | null {
  if (!Array.isArray(groups)) return null;

  for (const groupId of groups) {
    if (typeof groupId !== "string") continue;

    const role = groupRoleMap[groupId];
    if (role) return role;
  }

  return null;
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
      const profileClaims = profile as any;
      const idTokenClaims = decodeJwtPayload(account?.id_token);

      const claims = {
        ...profileClaims,
        ...idTokenClaims,
      };

      const groups = Array.isArray(claims?.groups) ? claims.groups : [];

      token.entraObjectId = claims?.oid ?? profileClaims?.oid ?? token.sub ?? null;
      token.entraGroups = groups;
      const email =
        token.email ??
        claims?.preferred_username ??
        claims?.email ??
        claims?.upn ??
        null;

      const roleFromGroups = getRoleFromGroups(groups);

      const bootstrapAdmins = String(process.env.SOUTHIN_BOOTSTRAP_ADMIN_EMAILS || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      const roleFromBootstrap =
        email && bootstrapAdmins.includes(String(email).toLowerCase())
          ? 'ADMIN'
          : null;

      token.email = email;
      token.staffRole = roleFromGroups ?? roleFromBootstrap;

      token.name =
        token.name ??
        claims?.name ??
        null;

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;

        (session.user as any).entraObjectId = token.entraObjectId;
        (session.user as any).entraGroups = token.entraGroups;
        (session.user as any).staffRole = token.staffRole;
      }

      return session;
    },
  },
};