import { getDb } from "@convect-xyz/server";
import { env } from "~/env";

export const db = getDb({ dbUrl: env.DATABASE_URL });
