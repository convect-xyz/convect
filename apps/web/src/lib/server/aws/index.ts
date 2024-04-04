import { ECS } from "@aws-sdk/client-ecs";
import { SNS } from "@aws-sdk/client-sns";
import { env } from "~/env";

export const sns = new SNS({ region: env.AWS_REGION });
export const ecs = new ECS({ region: env.AWS_REGION });
