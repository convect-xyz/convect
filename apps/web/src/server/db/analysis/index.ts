import { getAnalysisDb } from "@convect-xyz/lib";
import { env } from "~/env";

export const analysisDb = getAnalysisDb({ dbUrl: env.REPORTING_DATABASE_URL });
