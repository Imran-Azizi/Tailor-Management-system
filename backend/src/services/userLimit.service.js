import { prisma } from "../lib/prisma.js";

export const DEFAULT_USER_LIMIT = 30;

const TENANT_USER_ACCOUNT_TYPES = [
  "ADMIN",
  "DOKAN",
  "DOKHT",
  "QICHIKAR",
  "FINANCE",
];

export function buildUserLimitReachedMessage(totalAllowed) {
  return `بیشتر از ${totalAllowed} کارمند اضافه کرده نمی توانید. اگر میخواهید بیشتر اضافه کنید با سوپر ادمین تماس بگیرید.`;
}

export function computeUserLimitStats({ defaultLimit, extraUserLimit, currentUserCount }) {
  const totalAllowed = defaultLimit + extraUserLimit;
  const remaining = Math.max(0, totalAllowed - currentUserCount);
  const isAtLimit = currentUserCount >= totalAllowed;

  return {
    defaultLimit,
    extraUserLimit,
    totalAllowed,
    currentUserCount,
    remaining,
    isAtLimit,
  };
}

export async function countTenantUsers(tenantId, client = prisma) {
  if (!tenantId) return 0;
  return client.user.count({
    where: {
      tenantId,
      accountType: { in: TENANT_USER_ACCOUNT_TYPES },
    },
  });
}

export async function countTenantUsersBatch(tenantIds, client = prisma) {
  const ids = [...new Set((tenantIds || []).filter(Boolean))];
  const counts = new Map(ids.map((id) => [id, 0]));
  if (!ids.length) return counts;

  const rows = await client.user.groupBy({
    by: ["tenantId"],
    where: {
      tenantId: { in: ids },
      accountType: { in: TENANT_USER_ACCOUNT_TYPES },
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    counts.set(row.tenantId, row._count._all);
  }
  return counts;
}

export async function getTenantUserLimitInfo(tenantId, client = prisma) {
  const tenant = await client.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, extraUserLimit: true },
  });
  if (!tenant) {
    const error = new Error("Tenant not found.");
    error.status = 404;
    throw error;
  }

  const currentUserCount = await countTenantUsers(tenantId, client);
  return computeUserLimitStats({
    defaultLimit: DEFAULT_USER_LIMIT,
    extraUserLimit: tenant.extraUserLimit,
    currentUserCount,
  });
}

export async function assertCanCreateUser(tenantId, client = prisma) {
  const limitInfo = await getTenantUserLimitInfo(tenantId, client);
  if (limitInfo.isAtLimit) {
    const error = new Error(buildUserLimitReachedMessage(limitInfo.totalAllowed));
    error.status = 403;
    error.code = "TENANT_USER_LIMIT_REACHED";
    error.limitInfo = limitInfo;
    throw error;
  }
  return limitInfo;
}

export function sendUserLimitReached(res, limitInfo) {
  return res.status(403).json({
    code: "TENANT_USER_LIMIT_REACHED",
    error: buildUserLimitReachedMessage(limitInfo.totalAllowed),
    limit: limitInfo,
  });
}
