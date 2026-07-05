import crypto from "crypto";

export const ACCESS_COOKIE_NAME = "tailor_access";
export const REFRESH_COOKIE_NAME = "tailor_session";
export const CSRF_COOKIE_NAME = "tailor_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const CSRF_SECRET =
  process.env.CSRF_SECRET ||
  process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_SECRET ||
  "tailor-csrf-secret-change-in-prod";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function cookieSecure() {
  const configured = process.env.COOKIE_SECURE;
  if (configured !== undefined) {
    return String(configured).toLowerCase() === "true";
  }

  const publicUrl =
    process.env.APP_PUBLIC_URL ||
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGINS?.split(",")[0]?.trim() ||
    "";

  if (/^https:\/\//i.test(publicUrl)) return true;
  if (/^http:\/\//i.test(publicUrl)) return false;

  return isProduction();
}

function cookieSameSite() {
  const configured = String(process.env.COOKIE_SAME_SITE || "").toLowerCase();
  const allowed = new Set(["strict", "lax", "none"]);
  if (allowed.has(configured)) {
    const sameSite = configured;
    return sameSite === "none" && !cookieSecure() ? "lax" : sameSite;
  }

  // Same-origin VPS deployments work best with lax cookies.
  if (!cookieSecure()) return "lax";
  return isProduction() ? "none" : "lax";
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) return cookies;
    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!key) return cookies;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

export function getCookie(req, name) {
  return parseCookies(req)[name] || null;
}

function cookieOptions({ httpOnly = true } = {}) {
  return {
    httpOnly,
    secure: cookieSecure(),
    sameSite: cookieSameSite(),
    path: "/",
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, cookieOptions());
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
  res.clearCookie(CSRF_COOKIE_NAME, cookieOptions());
}

function signCsrfValue(value) {
  return crypto.createHmac("sha256", CSRF_SECRET).update(value).digest("base64url");
}

export function createCsrfToken() {
  const value = crypto.randomBytes(32).toString("base64url");
  return `${value}.${signCsrfValue(value)}`;
}

export function setCsrfCookie(res, csrfToken) {
  res.cookie(CSRF_COOKIE_NAME, csrfToken, cookieOptions());
}

export function isValidCsrfToken(csrfToken) {
  if (!csrfToken || typeof csrfToken !== "string") return false;
  const [value, signature, extra] = csrfToken.split(".");
  if (!value || !signature || extra !== undefined) return false;

  const expected = signCsrfValue(value);
  const provided = Buffer.from(signature);
  const actual = Buffer.from(expected);
  return provided.length === actual.length && crypto.timingSafeEqual(provided, actual);
}

export function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}
