import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator } from "../permissions";

export const getFunctions = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.object({
      functions: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          description: z.string(),
          chains: z.array(
            z.object({
              chainId: z.number(),
            }),
          ),
        }),
      ),
    }),
  )
  .query(async ({ ctx, input }) => {
    const collaborator = await getCollaborator(
      input.projectId,
      ctx.session.user.id,
    );
    if (!collaborator) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const functions = await ctx.db
      .select()
      .from(schema.convectFunctions)
      .where(eq(schema.convectFunctions.projectId, collaborator.projectId));

    return {
      functions: functions.map((f) => {
        return {
          ...f,
          chains: [],
        };
      }),
    };
  });
