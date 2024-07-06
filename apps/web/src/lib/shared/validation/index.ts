import { custom } from "zod";

export const monikerRegex = /^[a-zA-Z0-9-]+$/;
export const moniker = custom<string>((v) => {
  if (!(typeof v === "string")) return false;

  return monikerRegex.test(v);
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
    return "https://docs.convect.xyz/";
  }
  return "http://localhost:3001/";
};
