export const navigation = [
  {
    name: "Overview",
    href: (projectId: number) => [
      `/projects/${projectId}/settings/overview`,
      `/projects/${projectId}/settings`,
    ],
  },
  {
    name: "Collaborators",
    href: (projectId: number) => [
      `/projects/${projectId}/settings/collaborators`,
    ],
  },
  {
    name: "Billing",
    href: (projectId: number) => [`/projects/${projectId}/settings/billing`],
  },
];
