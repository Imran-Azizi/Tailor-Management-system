const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;

function stripTrailingSlash(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

/**
 * Normalize a single origin entry from env into zero or more allowed origins.
 * - Full URL: used as-is
 * - localhost:5173: http://localhost:5173
 * - example.com: http + https for apex and www (unless CORS_ALLOW_HTTP=false)
 */
export function expandOriginEntry(value) {
  const raw = stripTrailingSlash(value);
  if (!raw) return [];
  if (raw === "*") return ["*"];

  if (/^https?:\/\//i.test(raw)) {
    return [raw];
  }

  if (LOCAL_HOST_PATTERN.test(raw)) {
    return [`http://${raw}`];
  }

  const apex = raw.replace(/^www\./i, "");
  const hosts = apex === raw ? [apex, `www.${apex}`] : [raw, apex];
  const uniqueHosts = [...new Set(hosts.map((host) => host.toLowerCase()))];
  const schemes = parseBoolean(process.env.CORS_ALLOW_HTTP, true)
    ? ["http", "https"]
    : ["https"];

  const origins = [];
  for (const host of uniqueHosts) {
    for (const scheme of schemes) {
      origins.push(`${scheme}://${host}`);
    }
  }
  return origins;
}

export function parseConfiguredOrigins() {
  const rawValues = [
    process.env.APP_PUBLIC_URL,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
    process.env.CORS_ORIGINS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const normalized = rawValues
    .flatMap(expandOriginEntry)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);

  if (!normalized.length) {
    return ["http://localhost:5173"];
  }

  return normalized;
}

export function normalizeRequestOrigin(origin) {
  const raw = stripTrailingSlash(origin);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (LOCAL_HOST_PATTERN.test(raw)) return `http://${raw}`;
  return `https://${raw}`;
}

export function isTrustedVercelDeployment(origin) {
  return /^https:\/\/tailor-management-system(-[a-z0-9-]+)?\.vercel\.app$/i.test(
    origin,
  );
}

export function getRequestHost(req) {
  const forwarded = req.get("x-forwarded-host");
  if (forwarded) {
    return String(forwarded).split(",")[0].trim().toLowerCase();
  }
  return String(req.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

/** VPS/nginx: frontend and /api share the same public host. */
export function isSameDeploymentHost(origin, req) {
  if (!origin || !req) return false;

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = getRequestHost(req);
    return Boolean(originHost && requestHost && originHost === requestHost);
  } catch {
    return false;
  }
}

export function createCorsBlockedError(origin) {
  return Object.assign(
    new Error(`CORS blocked for origin: ${origin}`),
    {
      status: 403,
      code: "CORS_BLOCKED",
      publicMessage:
        "This site is not allowed to access the API. Set FRONTEND_URL or CORS_ORIGINS on the server.",
    },
  );
}

export function isOriginAllowed(origin, req, configuredOrigins) {
  if (!origin) return true;

  const normalizedRequestOrigin = normalizeRequestOrigin(origin);
  if (!normalizedRequestOrigin) return false;

  if (
    configuredOrigins.includes("*") ||
    configuredOrigins.includes(normalizedRequestOrigin) ||
    isTrustedVercelDeployment(normalizedRequestOrigin)
  ) {
    return true;
  }

  return isSameDeploymentHost(normalizedRequestOrigin, req);
}

export function createCorsMiddlewareOptions(configuredOrigins) {
  return function corsOptionsDelegate(req, callback) {
    callback(null, {
      origin(origin, originCallback) {
        if (isOriginAllowed(origin, req, configuredOrigins)) {
          originCallback(null, true);
          return;
        }

        const normalizedRequestOrigin =
          normalizeRequestOrigin(origin) || String(origin || "");
        originCallback(createCorsBlockedError(normalizedRequestOrigin));
      },
      credentials: true,
      optionsSuccessStatus: 200,
    });
  };
}
