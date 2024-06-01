import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stackName = pulumi.getStack();

const extension = new aws.lambda.LayerVersion("handler_extension", {
  layerName: `${stackName}_handler_extension`,
  compatibleArchitectures: ["x86_64"],
  compatibleRuntimes: ["provided.al2", "provided.al2023"],
  description: "Handler Extension",
  s3Bucket: "ingest-functions",
  s3Key: `extension/${stackName}.zip`,
  s3ObjectVersion: "jyH6KN9A5E2O8a9wVuSK1gkaS9eU.u3C",
  skipDestroy: false,
});

const http_extension = new aws.lambda.LayerVersion("http_extension", {
  layerName: `${stackName}_http_extension`,
  compatibleArchitectures: ["x86_64"],
  compatibleRuntimes: ["provided.al2", "provided.al2023"],
  description: "Handler HTTP Extension",
  s3Bucket: "ingest-functions",
  s3Key: `http/${stackName}.zip`,
  s3ObjectVersion: "xaJq_UEaKaEiaBmzdBLrXc8EiP89TqaN",
  skipDestroy: false,
});

const syncer = new aws.ecs.TaskDefinition("syncer_task_definition", {
  family: `${stackName}_syncer`,
  containerDefinitions: JSON.stringify([
    {
      name: "syncer",
      image: `730335604495.dkr.ecr.eu-west-1.amazonaws.com/syncer:${stackName}`,
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
        image: `730335604495.dkr.ecr.eu-west-1.amazonaws.com/builder:${stackName}`,
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
            // REDACTED
            value: process.env.PULUMI_ACCESS_TOKEN,
          },
          {
            name: "VERSION",
            value: stackName,
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
