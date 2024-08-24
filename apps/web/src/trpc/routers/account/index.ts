import { createTRPCRouter } from "~/trpc/trpc";
import { acceptInvite } from "./acceptInvite";
import { getPaymentMethods } from "./getPaymentMethods";
import { getPendingInvites } from "./getPendingInvites";
import { getStripeSetupIntent } from "./getStripeSetupIntent";
import { getUsage } from "./getUsage";
import { setDefaultPaymentMethod } from "./setDefaultPaymentMethod";

export const accountsRouter = createTRPCRouter({
  acceptInvite,
  getPendingInvites,
  getUsage,
  getPaymentMethods,
  getStripeSetupIntent,
  setDefaultPaymentMethod,
});
