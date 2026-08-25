import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      entraObjectId?: string | null;
      entraGroups?: string[];
      staffRole?: string | null;
      entraGroupOverage?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    entraObjectId?: string | null;
    entraGroups?: string[];
    staffRole?: string | null;
    entraGroupOverage?: boolean;
  }
}