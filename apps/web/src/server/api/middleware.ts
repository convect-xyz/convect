import { experimental_standaloneMiddleware } from "@trpc/server";
import { InferSelectModel } from "drizzle-orm";
import { Octokit } from "octokit";
import { accounts } from "../db/schema";

export const octokitMiddleware = experimental_standaloneMiddleware<{
  ctx: { githubAccount: InferSelectModel<typeof accounts> };
}>().create((opts) => {
  const octokit = new Octokit({
    auth: opts.ctx.githubAccount.access_token,
  });

  return opts.next({
    ctx: { octokit },
  });
});
