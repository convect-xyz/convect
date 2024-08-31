import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { formatDate } from "date-fns";
import { cache } from "react";
import { env } from "~/env";

export function getCloudfrontSignedUrl(path: string) {
  const cloudfrontDistributionDomain = env.CLOUDFRONT_PLANS_URL;
  const url = `${cloudfrontDistributionDomain}/${path}`;
  const privateKey = env.CLOUDFRONT_PRIVATE_KEY;
  const keyPairId = env.CLOUDFRONT_KEY_PAIR_ID;

  return getSignedUrl({
    url,
    keyPairId,
    dateLessThan: formatDate(new Date(), "yyyy-MM-dd"),
    privateKey,
  });
}

export const loadFromPath = cache(async (path: string) => {
  const response = await fetch(getCloudfrontSignedUrl(path));
  return await response.json();
});
