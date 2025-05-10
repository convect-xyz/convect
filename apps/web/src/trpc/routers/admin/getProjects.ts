import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure } from "~/trpc/trpc";

export const getProjects = adminProcedure
  .input(
    z.object({
      cursor: z.number().nullish(),
      search: z.string().nullish(),
    }),
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          planType: z.enum(["HOBBY", "PRO", "ENTERPRISE"]),
        }),
      ),
      nextCursor: z.number().nullish(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const projects = await ctx.db.query.projects.findMany({
      where: (fields, { gte, ilike, and }) => {
        const filters = [sql`1 = 1`];
        if (input.cursor) {
          filters.push(gte(fields.id, input.cursor));
        }
        if (input.search) {
          filters.push(ilike(fields.name, input.search));
        }
        return and(...filters);
      },
      orderBy: (fields, { asc }) => asc(fields.id),
      limit: 10,
    });

    return {
      projects,
      nextCursor: projects.at(-1)?.id,
    };
  });
