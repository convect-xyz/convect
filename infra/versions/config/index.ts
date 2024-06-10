import * as pulumi from "@pulumi/pulumi";
import * as z from "zod";

const stackName = pulumi.getStack();
const schema = z.object({
  pulumiAccessToken: z.string(),
  stripeApiKey: z.string(),
});

export const getConfigForStack = async () => {
  return import(`./${stackName}`).then(schema.parse);
};
