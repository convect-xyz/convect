import { custom } from "zod";

const moniker = custom<string>((v) => {
  if (!(typeof v === "string")) return false;

  const regex = /^[a-zA-Z0-9-]+$/;
  return regex.test(v);
});
const project = moniker;
const handler = moniker;

const xZod = {
  project,
  handler,
};

export default xZod;

export const getDocsUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://docs.convect.xyz/docs";
  }
  return "http://localhost:3001/docs";
};
