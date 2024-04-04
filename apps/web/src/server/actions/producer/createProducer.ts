import { CreateServiceCommand } from "@aws-sdk/client-ecs";
import { CreateTopicCommand } from "@aws-sdk/client-sns";
import { Session } from "next-auth";
import { ecs, sns } from "~/lib/server/aws";
import { Context } from "~/server/api/trpc";
import { producers, projects } from "~/server/db/schema";

type CreateProducerParams = Context & {
  id: string;
  wsUrl: string;
  pollingUrl: string;
  session: Session;
};

const PRODUCER_TASK_DEFINITION =
  "arn:aws:ecs:eu-west-1:730335604495:task-definition/mainnet:9";
const PRODUCER_CLUSTER = "arn:aws:ecs:eu-west-1:730335604495:cluster/mainnet";

export async function createProducer(params: CreateProducerParams) {
  const { arn: topicArn } = await createSnsTopic(params);
  const { arn: serviceArn } = await createService({
    ...params,
    snsTopicArn: topicArn,
  });

  const producer = await params.db
    .insert(producers)
    .values({
      id: params.id,
      wsUrl: params.wsUrl,
      pollingUrl: params.pollingUrl,
      userId: params.session.user.id,
      serviceArn,
      topicArn,
    })
    .returning({ id: projects.id })
    .then((r) => r[0]!);

  return producer;
}

async function createSnsTopic(params: CreateProducerParams) {
  const command = new CreateTopicCommand({
    Name: params.id,
  });

  const res = await sns.send(command);
  if (!res.TopicArn) throw new Error("Topic ARN is undefined");

  return {
    arn: res.TopicArn,
  };
}

async function createService(
  params: CreateProducerParams & {
    snsTopicArn: string;
  },
) {
  const command = new CreateServiceCommand({
    serviceName: params.id,
    desiredCount: 1,
    taskDefinition: PRODUCER_TASK_DEFINITION,
    cluster: PRODUCER_CLUSTER,
    propagateTags: "SERVICE",
    tags: [
      {
        key: "websocketUrl",
        value: params.wsUrl,
      },
      {
        key: "pollingUrl",
        value: params.pollingUrl,
      },
      {
        key: "snsTopicArn",
        value: params.snsTopicArn,
      },
    ],
  });

  const res = await ecs.send(command);

  if (!res.service?.serviceArn) {
    throw new Error("Service ARN is undefined");
  }

  return {
    arn: res.service.serviceArn,
  };
}
