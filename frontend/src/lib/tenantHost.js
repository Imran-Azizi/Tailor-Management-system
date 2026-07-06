const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1)$/i;

function getConfiguredRootDomain() {
  return String(import.meta.env.VITE_ROOT_DOMAIN || "")
    .trim()
    .toLowerCase();
}

export function getAdminSubdomain() {
  return String(import.meta.env.VITE_ADMIN_SUBDOMAIN || "admin")
    .trim()
    .toLowerCase();
}

function deriveRootDomain(hostname) {
  const configured = getConfiguredRootDomain();
  if (configured) return configured;

  const labels = String(hostname || "")
    .split(".")
    .filter(Boolean);
  if (labels.length < 2) return "";
  return labels.slice(-2).join(".");
}

export function getTenantHostContext(hostname = window.location.hostname) {
  const normalizedHost = String(hostname || "").trim().toLowerCase();
  const rootDomain = deriveRootDomain(normalizedHost);
  const adminSubdomain = getAdminSubdomain();
  const adminHost = rootDomain ? `${adminSubdomain}.${rootDomain}` : "";

  if (!normalizedHost) {
    return {
      hostname: "",
      hostType: "external",
      tenantSlug: null,
      rootDomain,
      adminHost,
    };
  }

  if (LOCAL_HOST_PATTERN.test(normalizedHost)) {
    return {
      hostname: normalizedHost,
      hostType: "local",
      tenantSlug: null,
      rootDomain,
      adminHost,
    };
  }

  if (rootDomain && (normalizedHost === rootDomain || normalizedHost === `www.${rootDomain}`)) {
    return {
      hostname: normalizedHost,
      hostType: "apex",
      tenantSlug: null,
      rootDomain,
      adminHost,
    };
  }

  if (rootDomain && normalizedHost === adminHost) {
    return {
      hostname: normalizedHost,
      hostType: "admin",
      tenantSlug: null,
      rootDomain,
      adminHost,
    };
  }

  if (rootDomain && normalizedHost.endsWith(`.${rootDomain}`)) {
    const tenantSlug = normalizedHost.slice(0, -(rootDomain.length + 1));
    if (tenantSlug && !tenantSlug.includes(".")) {
      return {
        hostname: normalizedHost,
        hostType: "tenant",
        tenantSlug,
        rootDomain,
        adminHost,
      };
    }
  }

  return {
    hostname: normalizedHost,
    hostType: "external",
    tenantSlug: null,
    rootDomain,
    adminHost,
  };
}

export function buildTenantUrl(slug, pathname = "/login") {
  const { rootDomain } = getTenantHostContext();
  if (!slug || !rootDomain) return null;
  return `${window.location.protocol}//${String(slug).trim().toLowerCase()}.${rootDomain}${pathname}`;
}

export function buildAdminUrl(pathname = "/login") {
  const { adminHost } = getTenantHostContext();
  if (!adminHost) return null;
  return `${window.location.protocol}//${adminHost}${pathname}`;
}

export function getExpectedUserUrl(user, pathname = "/login") {
  if (!user) return null;
  if (user.accountType === "SUPER_ADMIN") {
    return buildAdminUrl(pathname);
  }
  if (user.tenant?.slug) {
    return buildTenantUrl(user.tenant.slug, pathname);
  }
  return null;
}
