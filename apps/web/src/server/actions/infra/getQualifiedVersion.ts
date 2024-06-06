import { env } from "~/env";

export const getQualifiedVersion = (version?: string) => {
  return (version ?? env.VERSION).replaceAll("/", "-");
};
