import axios from "axios";
import { normalizeDigits } from "./normalize.js";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

function normalizeApiPayload(payload) {
  return normalizeDigits(payload);
}

function shouldBypassResponseNormalization(config = {}) {
  return ["arraybuffer", "blob", "stream"].includes(
    String(config?.responseType || "").toLowerCase(),
  );
}

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.params !== undefined) {
    config.params = normalizeApiPayload(config.params);
  }
  if (config.data !== undefined) {
    config.data = normalizeApiPayload(config.data);
  }
  return config;
});

// On 401 try to refresh once, then redirect to login
api.interceptors.response.use(
  (response) => {
    if (!shouldBypassResponseNormalization(response.config)) {
      response.data = normalizeApiPayload(response.data);
    }
    return response;
  },
  async (err) => {
    if (err?.response && !shouldBypassResponseNormalization(err.config)) {
      err.response.data = normalizeApiPayload(err.response.data);
    }
    if (err.response?.status === 402) {
      window.location.href = "/subscription-expired";
      return Promise.reject(err);
    }
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const { data } = await axios.post(
            (import.meta.env.VITE_API_URL || "/api") + "/auth/refresh",
            { refreshToken },
          );
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          if (data.user) {
            localStorage.setItem("authUser", JSON.stringify(data.user));
          }
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        }
      } catch {
        // refresh failed — clear and redirect
      }
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authUser");
      window.location.href = "/login";
    }
    if (import.meta.env.DEV) {
      console.error("[API]", err.response?.data || err.message);
    }
    return Promise.reject(err);
  },
);

export default api;
