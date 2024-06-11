import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "./server/db";
import schema from "./server/db/schema";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: number;
    } & DefaultSession["user"];
  }
}
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    verificationTokensTable: schema.verificationTokens,
    sessionsTable: schema.sessions,
    accountsTable: schema.accounts,
  }),
  providers: [GitHub],
  pages: {
    signIn: "/login",
  },
});
