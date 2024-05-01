import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { createTable } from "../../../packages/lib/src/db/schema";
import { db } from "./server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: number;
    } & DefaultSession["user"];
  }
}
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, createTable),
  providers: [GitHub],
  pages: {
    signIn: "/login",
  },
});
