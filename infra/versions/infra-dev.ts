import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stackName = pulumi.getStack();
const GITHUB_SHA = process.env.GITHUB_SHA!;

const extension = new aws.lambda.LayerVersion("handler_extension", {
  layerName: `${stackName}_handler_extension`,
  compatibleArchitectures: ["x86_64"],
  compatibleRuntimes: ["provided.al2", "provided.al2023"],
  description: "Handler Extension",
  s3Bucket: "ingest-functions",
  s3Key: `extension/${GITHUB_SHA}.zip`,
  skipDestroy: false,
});

const http_extension = new aws.lambda.LayerVersion("http_extension", {
  layerName: `${stackName}_http_extension`,
  compatibleArchitectures: ["x86_64"],
  compatibleRuntimes: ["provided.al2", "provided.al2023"],
  description: "Handler HTTP Extension",
  s3Bucket: "ingest-functions",
  s3Key: `http/${GITHUB_SHA}.zip`,
  skipDestroy: false,
});

const syncer = new aws.ecs.TaskDefinition("syncer_task_definition", {
  family: `${stackName}_syncer`,
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
      environment: [
        {
          name: "PULUMI_ACCESS_TOKEN",
          value: process.env.PULUMI_ACCESS_TOKEN,
        },
        {
          name: "VERSION",
          value: stackName,
        },
        {
          name: "GITHUB_SHA",
          value: GITHUB_SHA,
        },
      ],
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
  cpu: "512",
  memory: "1024",
  volumes: [],
  placementConstraints: [],
  requiresCompatibilities: ["FARGATE"],
  taskRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
  executionRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
  networkMode: "awsvpc",
});

const builder = new aws.ecs.TaskDefinition(
  "builder_task_definition",
  {
    family: `${stackName}_builder`,
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
        environment: [
          {
            name: "PULUMI_ACCESS_TOKEN",
            value: process.env.PULUMI_ACCESS_TOKEN,
          },
          {
            name: "VERSION",
            value: stackName,
          },
          {
            name: "GITHUB_SHA",
            value: GITHUB_SHA,
          },
        ],
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
    cpu: "512",
    memory: "1024",
    volumes: [],
    placementConstraints: [],
    requiresCompatibilities: ["FARGATE"],
    taskRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
    executionRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
    networkMode: "awsvpc",
  },
  { dependsOn: [syncer] }
);

export const handler_extension_arn = extension.arn;
export const http_extension_arn = http_extension.arn;
export const builder_task_definition = builder.arn;
export const syncer_task_definition = syncer.arn;

export * from "./vpc";

export const github_sha: pulumi.Output<string> =
  pulumi.Output.create(GITHUB_SHA);
