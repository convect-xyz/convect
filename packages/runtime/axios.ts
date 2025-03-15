import axios from "axios";
import axiosRetry from "axios-retry";

export const handlerServerAxios = axios.create({
  baseURL: "http://127.0.0.1:4121",
});

axiosRetry(handlerServerAxios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
});
