import axios from "axios";

export const buildEtherscanAxios = (explorerUrl: string) => {
  return axios.create({
    baseURL: explorerUrl,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
