import { getDb } from "@convect-xyz/lib";
import { env } from "~/env";

export const db = getDb({ dbUrl: env.DATABASE_URL });
