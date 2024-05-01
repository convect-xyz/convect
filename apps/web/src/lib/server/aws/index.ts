import { ECS } from "@aws-sdk/client-ecs";
import { Lambda } from "@aws-sdk/client-lambda";
import { S3 } from "@aws-sdk/client-s3";
import { SNS } from "@aws-sdk/client-sns";
import { SQS } from "@aws-sdk/client-sqs";
import { env } from "~/env";

export const sns = new SNS({ region: env.AWS_REGION });
export const s3 = new S3({ region: env.AWS_REGION });
export const ecs = new ECS({ region: env.AWS_REGION });
export const lambda = new Lambda({ region: env.AWS_REGION });
export const sqs = new SQS({ region: env.AWS_REGION });
