import { prisma } from "../lib/prisma.js";
import { getRequestHostContext } from "../lib/tenantHost.js";

const tenantHostSelect = {
  id: true,
  tenantId: true,
  slug: true,
  businessName: true,
  systemName: true,
  logoUrl: true,
  subscriptionStatus: true,
  expiryDate: true,
  isActive: true,
};

export async function resolveTenantHost(req, res, next) {
  try {
    const hostContext = getRequestHostContext(req);
    req.hostContext = hostContext;
    req.tenantHost = null;

    if (hostContext.hostType === "tenant" && hostContext.tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: hostContext.tenantSlug },
        select: tenantHostSelect,
      });

      if (!tenant) {
        req.hostContext = { ...hostContext, hostType: "unknown-tenant" };
        if (req.path.startsWith("/api")) {
          return res.status(404).json({
            code: "TENANT_HOST_NOT_FOUND",
            error: "Tenant subdomain was not found.",
          });
        }
        return next();
      }

      req.tenantHost = tenant;
    }

    next();
  } catch (error) {
    next(error);
  }
}
