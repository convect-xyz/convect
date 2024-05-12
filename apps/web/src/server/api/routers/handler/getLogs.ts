import axios from "axios";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

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
      handlerId: z.number(),
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
  .query(async ({ input }) => {
    const logs = await axios
      .post(
        "https://api.eu-central-1.aws.tinybird.co/v0/sql",
        {
          q: `%
        SELECT * FROM ingest_pipe WHERE handler_id = {{String(handler_id)}} ORDER BY parseDateTimeBestEffortOrNull(time) DESC LIMIT 50 FORMAT JSON`,
          handler_id: input.handlerId,
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
