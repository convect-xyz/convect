import { createTRPCRouter } from "~/trpc/trpc";
import { acceptInvite } from "./acceptInvite";
import { getPendingInvites } from "./getPendingInvites";

export const accountsRouter = createTRPCRouter({
  acceptInvite,
  getPendingInvites,
});
