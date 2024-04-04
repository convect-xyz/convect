import { millisecondsToSeconds, minutesToSeconds } from "date-fns";
import jwt from "jsonwebtoken";
import { env } from "~/env";

export const generateAppJwt = async () => {
  return jwt.sign(
    {
      iat: millisecondsToSeconds(Date.now()) - 60,
      exp: millisecondsToSeconds(Date.now()) + minutesToSeconds(10),
      iss: env.GITHUB_CLIENT_ID,
    },
    env.GITHUB_CLIENT_SECRET,
  );
};
