const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;
const DEFAULT_ADMIN_SUBDOMAIN = "admin";
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "mail",
  "ftp",
  "support",
]);

function stripPort(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function deriveRootDomainFromConfig(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const hostname = stripPort(parsed.hostname);
    if (!hostname || LOCAL_HOST_PATTERN.test(hostname)) return null;

    const adminSubdomain = getAdminSubdomain();
    if (hostname === `www.${hostname.replace(/^www\./, "")}`) {
      return hostname.replace(/^www\./, "");
    }
    if (hostname.startsWith(`${adminSubdomain}.`)) {
      return hostname.slice(adminSubdomain.length + 1);
    }
    return hostname;
  } catch {
    return null;
  }
}

export function getAdminSubdomain() {
  return String(process.env.ADMIN_SUBDOMAIN || DEFAULT_ADMIN_SUBDOMAIN)
    .trim()
    .toLowerCase();
}

export function getRootDomain() {
  const configured = deriveRootDomainFromConfig(process.env.APP_ROOT_DOMAIN);
  if (configured) return configured;

  const fromPublic = deriveRootDomainFromConfig(process.env.APP_PUBLIC_URL);
  if (fromPublic) return fromPublic;

  const fromFrontend = deriveRootDomainFromConfig(process.env.FRONTEND_URL);
  if (fromFrontend) return fromFrontend;

  return null;
}

export function getReservedSubdomains() {
  return new Set([...RESERVED_SUBDOMAINS, getAdminSubdomain()]);
}

export function getForwardedHost(req) {
  const forwarded = req.get("x-forwarded-host");
  if (forwarded) {
    return String(forwarded).split(",")[0].trim().toLowerCase();
  }
  return String(req.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export function getRequestProtocol(req) {
  const forwardedProto = req.get("x-forwarded-proto");
  if (forwardedProto) {
    return String(forwardedProto).split(",")[0].trim().toLowerCase() || "https";
  }
  if (req.protocol) return String(req.protocol).toLowerCase();
  return "https";
}

function deriveFallbackRootDomain(hostname) {
  const labels = String(hostname || "")
    .split(".")
    .filter(Boolean);
  if (labels.length < 2) return null;
  return labels.slice(-2).join(".");
}

export function resolveHostContext(inputHost) {
  const hostname = stripPort(inputHost);
  const rootDomain = getRootDomain() || deriveFallbackRootDomain(hostname);
  const adminSubdomain = getAdminSubdomain();
  const adminHost = rootDomain ? `${adminSubdomain}.${rootDomain}` : null;
  const apexHost = rootDomain || hostname || null;

  const context = {
    host: String(inputHost || "").trim().toLowerCase(),
    hostname,
    rootDomain,
    apexHost,
    adminSubdomain,
    adminHost,
    hostType: "external",
    tenantSlug: null,
  };

  if (!hostname) return context;
  if (LOCAL_HOST_PATTERN.test(hostname)) {
    context.hostType = "local";
    return context;
  }
  if (!rootDomain) return context;
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    context.hostType = "apex";
    return context;
  }
  if (hostname === adminHost) {
    context.hostType = "admin";
    return context;
  }
  if (!hostname.endsWith(`.${rootDomain}`)) {
    return context;
  }

  const subdomain = hostname.slice(0, -(rootDomain.length + 1));
  if (!subdomain || subdomain.includes(".")) {
    context.hostType = "external";
    return context;
  }

  if (getReservedSubdomains().has(subdomain)) {
    context.hostType = "reserved";
    return context;
  }

  context.hostType = "tenant";
  context.tenantSlug = subdomain;
  return context;
}

export function getRequestHostContext(req) {
  return resolveHostContext(getForwardedHost(req));
}

export function buildHostUrl(req, host, pathname = "/login") {
  if (!host) return null;
  const protocol = getRequestProtocol(req);
  return `${protocol}://${host}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function buildTenantHost(slug, rootDomain = getRootDomain()) {
  if (!slug || !rootDomain) return null;
  return `${String(slug).trim().toLowerCase()}.${rootDomain}`;
}

export function createTenantHostAccessError(req, user) {
  const hostContext = req.hostContext || getRequestHostContext(req);
  if (!hostContext || hostContext.hostType === "local") return null;

  const tenantHost = buildTenantHost(user?.tenant?.slug, hostContext.rootDomain);
  const adminHost = hostContext.adminHost;

  if (user?.accountType === "SUPER_ADMIN") {
    if (hostContext.hostType === "admin") return null;
    return {
      status: 403,
      code: "SUPER_ADMIN_HOST_REQUIRED",
      error: "Super admin accounts must sign in on the admin subdomain.",
      expectedHost: adminHost,
      redirectUrl: buildHostUrl(req, adminHost),
    };
  }

  if (!user?.tenant?.slug) {
    return {
      status: 403,
      code: "TENANT_HOST_REQUIRED",
      error: "Tenant account is missing a subdomain mapping.",
      expectedHost: null,
      redirectUrl: null,
    };
  }

  if (hostContext.hostType === "tenant" && hostContext.tenantSlug === user.tenant.slug) {
    return null;
  }

  return {
    status: 403,
    code:
      hostContext.hostType === "tenant"
        ? "TENANT_HOST_MISMATCH"
        : "TENANT_HOST_REQUIRED",
    error: "This account must be used from its assigned tenant subdomain.",
    expectedHost: tenantHost,
    redirectUrl: buildHostUrl(req, tenantHost),
  };
}
