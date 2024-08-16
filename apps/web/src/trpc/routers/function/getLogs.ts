import { TRPCError } from "@trpc/server";
import axios from "axios";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotCollaborator } from "../permissions";

const response = z.object({
  data: z.array(
    z.object({
      time: z.string(),
      log_message: z.string(),
      log_level: z.string(),
      invocation_id: z.string(),
    }),
  ),
});

export const getLogs = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
      chainId: z.number(),
      logLevel: z.enum(["INFO", "DEBUG", "ERROR"]),
    }),
  )
  .output(
    z.array(
      z.object({
        time: z.string(),
        log_message: z.string(),
        log_level: z.string(),
        invocation_id: z.string(),
      }),
    ),
  )
  .query(async ({ input, ctx }) => {
    const fn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.functionId);
      },
    });
    if (!fn) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    await throwIfNotCollaborator(fn.projectId, ctx.session.user.id);

    const logs = await axios
      .post(
        "https://api.eu-central-1.aws.tinybird.co/v0/sql",
        {
          q: `%
        SELECT * FROM ingest_pipe WHERE handler_id = {{String(handler_id)}} AND handler_version = {{String(handler_version)}} AND log_level = {{String(log_level)}} ORDER BY parseDateTimeBestEffortOrNull(time) DESC LIMIT 50 FORMAT JSON`,
          handler_id: input.functionId,
          handler_version: input.chainId.toString(),
          log_level: input.logLevel,
        },
        {
          headers: {
            Authorization:
              "Bearer REDACTED",
          },
        },
      )
      .then((r) => r.data)
      .then(response.parse)
      .catch((e) => {
        console.log(e.response.data);
        throw e;
      });

    return logs.data;
  });
