import { getAnalysisDb } from "@convect-xyz/server";
import { env } from "~/env";

export const analysisDb = getAnalysisDb({ dbUrl: env.REPORTING_DATABASE_URL });
