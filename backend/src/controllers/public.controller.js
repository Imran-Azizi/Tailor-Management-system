export function getTenantContext(req, res) {
  const hostContext = req.hostContext || {
    hostType: "external",
    host: null,
    hostname: null,
    rootDomain: null,
    adminHost: null,
    apexHost: null,
  };

  if (hostContext.hostType === "unknown-tenant") {
    return res.status(404).json({
      code: "TENANT_HOST_NOT_FOUND",
      error: "Tenant subdomain was not found.",
      hostType: "unknown-tenant",
    });
  }

  const payload = {
    hostType: hostContext.hostType,
    host: hostContext.hostname || hostContext.host || null,
    apexHost: hostContext.apexHost || null,
    adminHost: hostContext.adminHost || null,
    tenant: null,
  };

  if (hostContext.hostType === "tenant") {
    if (!req.tenantHost) {
      return res.status(404).json({
        code: "TENANT_HOST_NOT_FOUND",
        error: "Tenant subdomain was not found.",
        hostType: "unknown-tenant",
      });
    }

    payload.tenant = {
      id: req.tenantHost.id,
      tenantId: req.tenantHost.tenantId,
      slug: req.tenantHost.slug,
      businessName: req.tenantHost.businessName,
      systemName: req.tenantHost.systemName,
      logoUrl: req.tenantHost.logoUrl,
      subscriptionStatus: req.tenantHost.subscriptionStatus,
      expiryDate: req.tenantHost.expiryDate,
      isActive: req.tenantHost.isActive,
    };
  }

  res.json(payload);
}
