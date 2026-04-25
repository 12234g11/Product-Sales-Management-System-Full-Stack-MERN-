import { authStorage } from "../storage/authStorage";
import { axiosClient } from "./axiosClient";
import { translateApiError } from "./errorMap";

let unauthorizedHandler = null;
let interceptorsReady = false;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export function setupInterceptors() {
  if (interceptorsReady) return;
  interceptorsReady = true;

  axiosClient.interceptors.request.use((config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axiosClient.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error?.response?.status;

      error.userMessage = translateApiError(error);

      if (status === 401) {
        unauthorizedHandler?.();
      }
      return Promise.reject(error);
    }
  );
}
