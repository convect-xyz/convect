import { createTRPCRouter } from "~/trpc/trpc";
import { acceptInvite } from "./acceptInvite";
import { getPendingInvites } from "./getPendingInvites";
import { getUsage } from "./getUsage";

export const accountsRouter = createTRPCRouter({
  acceptInvite,
  getPendingInvites,
  getUsage,
});
