import * as pulumi from "@pulumi/pulumi";
import { configSchema } from './schema';

const stackName = pulumi.getStack();

export const getConfigForStack = async () => {
  return import(`./${stackName}`).then((v) => configSchema.parse(v.default));
};
