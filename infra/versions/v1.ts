import * as aws from "@pulumi/aws";
import { Output } from "@pulumi/pulumi";

const GITHUB_SHA = process.env.GITHUB_SHA!;

const extension = new aws.lambda.LayerVersion("v1_handler_extension", {
  layerName: "v1_handler_extension",
  compatibleArchitectures: ["x86_64"],
  compatibleRuntimes: ["provided.al2", "provided.al2023"],
  description: "Handler Extension",
  s3Bucket: "ingest-functions",
  s3Key: `extension/${GITHUB_SHA}`,
  s3ObjectVersion: "string",
  skipDestroy: false,
});

const builder = new aws.ecs.TaskDefinition("v1_builder_task_definition", {
  family: "builder",
  containerDefinitions: JSON.stringify([
    {
      name: "builder",
      image: `730335604495.dkr.ecr.eu-west-1.amazonaws.com/builder:${GITHUB_SHA}`,
      cpu: 0,
      portMappings: [
        {
          name: "builder-80-tcp",
          containerPort: 80,
          hostPort: 80,
          protocol: "tcp",
          appProtocol: "http",
        },
        {
          name: "builder-443-tcp",
          containerPort: 443,
          hostPort: 443,
          protocol: "tcp",
        },
      ],
      essential: true,
      environment: [],
      environmentFiles: [],
      mountPoints: [],
      volumesFrom: [],
      ulimits: [],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-create-group": "true",
          "awslogs-group": "/ecs/builder",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs",
        },
        secretOptions: [],
      },
      systemControls: [],
    },
  ]),
  volumes: [],
  placementConstraints: [],
});

const syncer = new aws.ecs.TaskDefinition("v1_syncer_task_definition", {
  family: "syncer",
  containerDefinitions: JSON.stringify([
    {
      name: "syncer",
      image: `730335604495.dkr.ecr.eu-west-1.amazonaws.com/syncer:${GITHUB_SHA}`,
      cpu: 0,
      portMappings: [
        {
          name: "syncer-80-tcp",
          containerPort: 80,
          hostPort: 80,
          protocol: "tcp",
          appProtocol: "http",
        },
        {
          name: "syncer-443-tcp",
          containerPort: 443,
          hostPort: 443,
          protocol: "tcp",
        },
      ],
      essential: true,
      environment: [],
      mountPoints: [],
      volumesFrom: [],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-create-group": "true",
          "awslogs-group": "/ecs/syncers",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs",
        },
      },
      systemControls: [],
    },
  ]),
  volumes: [],
  placementConstraints: [],
});

export const handler_extension_arn = extension.arn;
export const builder_task_definition = builder.arn;
export const syncer_task_definition = syncer.arn;
export const github_sha: Output<string> = Output.create(GITHUB_SHA);
