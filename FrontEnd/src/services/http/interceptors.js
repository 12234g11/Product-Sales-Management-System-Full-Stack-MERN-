import { authStorage } from "../storage/authStorage";
import { axiosClient } from "./axiosClient";

let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

function extractMessage(error) {
  const body = error?.response?.data;

  if (body?.message) return body.message;

  const dataObj = body?.data;
  if (dataObj && typeof dataObj === "object") {
    const firstStr = Object.values(dataObj).find((v) => typeof v === "string");
    if (firstStr) return firstStr;
    if (typeof dataObj.message === "string") return dataObj.message;
  }

  return error?.message || "حدث خطأ غير متوقع";
}

export function setupInterceptors() {
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

      error.userMessage = extractMessage(error);

      if (status === 401) {
        unauthorizedHandler?.();
      }
      return Promise.reject(error);
    }
  );
}
