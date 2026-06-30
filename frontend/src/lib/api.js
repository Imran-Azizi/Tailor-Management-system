import axios from "axios";
import { normalizeDigits } from "./normalize.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const SAFE_METHODS = new Set(["get", "head", "options"]);

let csrfToken = null;
let csrfPromise = null;
let onAuthSessionExpired = null;
let refreshPromise = null;

const csrfClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

function normalizeApiPayload(payload) {
  return normalizeDigits(payload);
}

function shouldBypassResponseNormalization(config = {}) {
  return ["arraybuffer", "blob", "stream"].includes(
    String(config?.responseType || "").toLowerCase(),
  );
}

function isUnsafeMethod(method) {
  return !SAFE_METHODS.has(String(method || "get").toLowerCase());
}

function isAuthRefreshRequest(config = {}) {
  return String(config.url || "").includes("/auth/refresh");
}

function isAuthLoginRequest(config = {}) {
  return String(config.url || "").includes("/auth/login");
}

function shouldRedirectToLogin(config = {}) {
  if (config.skipAuthRedirect) return false;
  return window.location.pathname !== "/login";
}

export function clearCsrfToken() {
  csrfToken = null;
  csrfPromise = null;
  refreshPromise = null;
}

export function setAuthSessionExpiredHandler(handler) {
  onAuthSessionExpired = typeof handler === "function" ? handler : null;
}

export async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = csrfClient
      .get("/auth/csrf")
      .then(({ data }) => {
        csrfToken = data?.csrfToken || null;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

async function attachCsrfHeader(config) {
  if (!isUnsafeMethod(config.method)) return config;

  const token = await ensureCsrfToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers[CSRF_HEADER_NAME] = token;
  }
  return config;
}

function expireAuthSession() {
  clearCsrfToken();
  onAuthSessionExpired?.();
}

api.interceptors.request.use(async (config) => {
  config.withCredentials = true;
  config = await attachCsrfHeader(config);

  if (config.params !== undefined) {
    config.params = normalizeApiPayload(config.params);
  }
  if (config.data !== undefined) {
    config.data = normalizeApiPayload(config.data);
  }
  return config;
});

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

    if (
      err.response?.status === 403 &&
      err.response?.data?.code === "CSRF_INVALID" &&
      original &&
      !original._csrfRetry
    ) {
      original._csrfRetry = true;
      clearCsrfToken();
      await attachCsrfHeader(original);
      return api(original);
    }

    if (
      err.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.skipAuthRefresh &&
      !isAuthRefreshRequest(original) &&
      !isAuthLoginRequest(original)
    ) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const token = await ensureCsrfToken();
            await csrfClient.post(
              "/auth/refresh",
              {},
              { headers: token ? { [CSRF_HEADER_NAME]: token } : undefined },
            );
            return true;
          } catch {
            return false;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const succeeded = await refreshPromise;
      if (succeeded) {
        delete original.headers?.Authorization;
        return api(original);
      }

      expireAuthSession();
      if (shouldRedirectToLogin(original)) {
        window.location.href = "/login";
      }
    }

    if (import.meta.env.DEV) {
      console.error("[API]", err.response?.data || err.message);
    }
    return Promise.reject(err);
  },
);

export default api;
