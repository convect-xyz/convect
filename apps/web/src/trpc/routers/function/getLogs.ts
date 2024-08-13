import axios from "axios";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

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
              "Bearer p.eyJ1IjogIjJlYjlhNzU2LWFjMDMtNDJmOC1iNGY2LWI2M2RhN2JiMjkyNiIsICJpZCI6ICJjZTE2YmI1Yi04NDBiLTQwNGMtYjk4Yi0zMjJiNDc4ZDMyYWEiLCAiaG9zdCI6ICJhd3MtZXUtY2VudHJhbC0xIn0.1Bvj9OA-NZQ0cU62T1sweLScNLMPsv8FIGaP8nkHoRw",
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
