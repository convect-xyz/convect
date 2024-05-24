import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();
const outputs = require(`./versions/${stack}`);

export { outputs };
