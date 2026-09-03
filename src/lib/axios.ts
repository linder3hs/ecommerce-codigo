import axios from "axios";

import { API_BASE_URL } from "./constants";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message;

      return Promise.reject(new Error(message));
    }

    return Promise.reject(error);
  },
);
