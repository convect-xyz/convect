// import * as aws from "@pulumi/aws";
// import * as pulumi from "@pulumi/pulumi";

// const stackName = pulumi.getStack();

// const convectVpc = new aws.ec2.Vpc("convect", {
//   cidrBlock: "172.31.0.0/16",
//   enableDnsHostnames: true,
//   instanceTenancy: "default",
//   tags: {
//     Name: `convect-${stackName}`,
//   },
// });

// const subnet_1 = new aws.ec2.Subnet("subnet-1", {
//   availabilityZone: "eu-west-1c",
//   cidrBlock: "172.31.16.0/20",
//   mapPublicIpOnLaunch: true,
//   privateDnsHostnameTypeOnLaunch: "ip-name",
//   vpcId: convectVpc.id,
//   tags: {
//     Name: `subnet-1-${stackName}`,
//   },
// });

// const subnet_2 = new aws.ec2.Subnet("subnet-2", {
//   availabilityZone: "eu-west-1b",
//   cidrBlock: "172.31.0.0/20",
//   mapPublicIpOnLaunch: true,
//   privateDnsHostnameTypeOnLaunch: "ip-name",
//   vpcId: convectVpc.id,
//   tags: {
//     Name: `subnet-2-${stackName}`,
//   },
// });

// const subnet_3 = new aws.ec2.Subnet("subnet-3", {
//   availabilityZone: "eu-west-1a",
//   cidrBlock: "172.31.32.0/20",
//   mapPublicIpOnLaunch: true,
//   privateDnsHostnameTypeOnLaunch: "ip-name",
//   vpcId: convectVpc.id,
//   tags: {
//     Name: `subnet-3-${stackName}`,
//   },
// });

// const route_table = new aws.ec2.RouteTable("public_rt", {
//   routes: [
//     {
//       cidrBlock: "0.0.0.0/0",
//       gatewayId: "igw-027bfb9e1133ed818",
//     },
//   ],
//   vpcId: convectVpc.id,
//   tags: {
//     Name: `public-rt-${stackName}`,
//   },
// });

// const gw = new aws.ec2.InternetGateway("gw", {
//   vpcId: convectVpc.id,
//   tags: {
//     Name: `igw-${stackName}`,
//   },
// });

// const vpc_sg = new aws.ec2.SecurityGroup("vpc_sg", {
//   description: "default VPC security group",
//   egress: [
//     {
//       cidrBlocks: ["0.0.0.0/0"],
//       description: "",
//       fromPort: 0,
//       ipv6CidrBlocks: [],
//       prefixListIds: [],
//       protocol: "-1",
//       securityGroups: [],
//       self: false,
//       toPort: 0,
//     },
//   ],
//   ingress: [
//     {
//       cidrBlocks: ["0.0.0.0/0"],
//       description: "",
//       fromPort: 0,
//       ipv6CidrBlocks: [],
//       prefixListIds: [],
//       protocol: "-1",
//       securityGroups: [],
//       self: false,
//       toPort: 0,
//     },
//   ],
//   name: `default`,
//   vpcId: convectVpc.id,
//   tags: {
//     Name: `vpc-sg-${stackName}`,
//   },
// });
