import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  getCookie,
  isValidCsrfToken,
} from "../lib/sessionCookies.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isCsrfExempt(req) {
  return req.path === "/auth/csrf" || req.path === "/health";
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || isCsrfExempt(req)) {
    return next();
  }

  const cookieToken = getCookie(req, CSRF_COOKIE_NAME);
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (
    !cookieToken ||
    !headerToken ||
    cookieToken !== headerToken ||
    !isValidCsrfToken(cookieToken)
  ) {
    return res.status(403).json({
      code: "CSRF_INVALID",
      error: "Your secure session check expired. Please try again.",
    });
  }

  next();
}
