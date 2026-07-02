import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      staffRole?: string | null;
      entraObjectId?: string | null;
      entraGroups?: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffRole?: string | null;
    entraObjectId?: string | null;
    entraGroups?: string[];
  }
}