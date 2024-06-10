import { z } from "zod";

import { getQualifiedVersion } from "../infra/getQualifiedVersion";
import { pulumiAxios } from "./axios";

const schema = z.object({
  outputs: z.object({
    outputs: z.object({
      githubSha: z.string(),
      handlerServerArn: z.string(),
      handlerExtensionArn: z.string(),
      builderTaskDefinition: z.string(),
      syncerTaskDefinition: z.string(),
    }),
  }),
});

export async function getStackOutputs() {
  return pulumiAxios
    .get(`/api/stacks/kayakthedev/infra/${getQualifiedVersion()}/export`)
    .then((r) => {
      return r.data.deployment.resources.find(
        (r: any) => r.type === "pulumi:pulumi:Stack",
      );
    })
    .then(schema.parse)
    .then((d) => d.outputs.outputs);
}
