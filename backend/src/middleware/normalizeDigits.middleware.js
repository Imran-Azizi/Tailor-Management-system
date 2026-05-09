import { normalizeDigitsDeep } from "../lib/normalize.js";

function normalizeRequestPart(value) {
  return normalizeDigitsDeep(value);
}

function isJsonLikeResponse(res) {
  const contentType = String(res.getHeader("Content-Type") || "").toLowerCase();
  return !contentType || contentType.includes("application/json");
}

export function normalizeDigitsMiddleware(req, res, next) {
  if (req.query) {
    req.query = normalizeRequestPart(req.query);
  }

  if (req.body) {
    req.body = normalizeRequestPart(req.body);
  }

  if (req.params) {
    req.params = normalizeRequestPart(req.params);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(normalizeRequestPart(body));

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (
      typeof body === "string" &&
      isJsonLikeResponse(res) &&
      !res.getHeader("Content-Disposition")
    ) {
      return originalSend(normalizeRequestPart(body));
    }
    return originalSend(body);
  };

  next();
}
