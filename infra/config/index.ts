import * as pulumi from "@pulumi/pulumi";
import * as z from "zod";

const stackName = pulumi.getStack();
const schema = z.object({
  reportingDbUrl: z.string(),
  pulumiAccessToken: z.string(),
  stripeApiKey: z.string(),
  tinybirdApiKey: z.string()
});

export const getConfigForStack = async () => {
  return import(`./${stackName}`).then((v) => schema.parse(v.default));
};
