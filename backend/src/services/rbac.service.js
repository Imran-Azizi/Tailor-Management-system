import { prisma } from "../lib/prisma.js";
import {
  cacheDeleteByPrefix,
  cacheGet,
  cacheSet,
} from "../lib/memoryCache.js";
import {
  ALL_PERMISSION_CODES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  RBAC_MANAGED_ACCOUNT_TYPES,
  expandModulePermissionCodes,
} from "../lib/permissions.js";

let catalogReady = false;
const RBAC_SYNC_VERSION = 2;
const tenantRbacReady = new Map();
const PERMISSION_CACHE = "user-permissions";
const PERMISSION_CACHE_TTL_MS = 60_000;

export function invalidateUserPermissionCache(userId) {
  if (!userId) return;
  cacheDeleteByPrefix(PERMISSION_CACHE, `${userId}:`);
}

function assertTenantId(tenantId) {
  if (!tenantId) {
    const error = new Error("Tenant context is required.");
    error.status = 400;
    throw error;
  }
}

export function isPrivilegedAccount(accountType) {
  return accountType === "SUPER_ADMIN" || accountType === "ADMIN";
}

export function normalizePermissionCodes(codes) {
  const valid = new Set(ALL_PERMISSION_CODES);
  return [...new Set((codes || []).map((code) => String(code || "").trim()))]
    .filter((code) => valid.has(code))
    .sort();
}

export async function ensurePermissionCatalog() {
  if (catalogReady) return;

  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        group: permission.group,
        description: permission.description || null,
      },
      create: {
        code: permission.code,
        group: permission.group,
        description: permission.description || null,
      },
    });
  }

  catalogReady = true;
}

export async function ensureTenantRbac(tenantId) {
  assertTenantId(tenantId);
  if (tenantRbacReady.get(tenantId) === RBAC_SYNC_VERSION) return;

  await ensurePermissionCatalog();

  const permissions = await prisma.permission.findMany({
    where: { code: { in: ALL_PERMISSION_CODES } },
    select: { id: true, code: true },
  });
  const permissionByCode = new Map(permissions.map((entry) => [entry.code, entry]));

  for (const [roleKey, defaultCodes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { tenantId_key: { tenantId, key: roleKey } },
      update: {
        name: roleKey,
        isSystem: true,
      },
      create: {
        tenantId,
        key: roleKey,
        name: roleKey,
        isSystem: true,
      },
      select: { id: true, key: true },
    });

    for (const code of defaultCodes) {
      const permission = permissionByCode.get(code);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    // Remove permissions that are no longer part of the role defaults so
    // Dokan/Finance roles stay empty after the zero-default policy change.
    const allowedPermissionIds = defaultCodes
      .map((code) => permissionByCode.get(code)?.id)
      .filter(Boolean);
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        ...(allowedPermissionIds.length
          ? { permissionId: { notIn: allowedPermissionIds } }
          : {}),
      },
    });
  }

  const tenantRoles = await prisma.role.findMany({
    where: { tenantId, key: { in: Object.keys(DEFAULT_ROLE_PERMISSIONS) } },
    select: { id: true, key: true },
  });
  const roleByKey = new Map(tenantRoles.map((role) => [role.key, role]));
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      accountType: { in: Object.keys(DEFAULT_ROLE_PERMISSIONS) },
    },
    select: { id: true, accountType: true },
  });

  const userRoleRows = users
    .map((user) => {
      const role = roleByKey.get(user.accountType);
      return role ? { tenantId, userId: user.id, roleId: role.id } : null;
    })
    .filter(Boolean);

  if (userRoleRows.length) {
    await prisma.userRole.createMany({
      data: userRoleRows,
      skipDuplicates: true,
    });
  }

  tenantRbacReady.set(tenantId, RBAC_SYNC_VERSION);
}

export async function getEffectivePermissionCodes(user) {
  if (!user) return [];
  if (isPrivilegedAccount(user.accountType)) return [...ALL_PERMISSION_CODES];
  if (!user.tenantId) return [];

  const cacheKey = `${user.id}:${user.tenantId}:${user.accountType}`;
  const cached = cacheGet(PERMISSION_CACHE, cacheKey);
  if (cached) return cached;

  await ensureTenantRbac(user.tenantId);

  const overrides = await prisma.userPermission.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    include: { permission: { select: { code: true } } },
    orderBy: { updatedAt: "asc" },
  });

  // Dokan/Finance: permissions are per-user only — never inherited from role
  // defaults. Until the admin saves permissions on the اجازه‌ها page the
  // user has zero access.
  if (RBAC_MANAGED_ACCOUNT_TYPES.includes(user.accountType)) {
    if (!overrides.length) {
      cacheSet(PERMISSION_CACHE, cacheKey, [], PERMISSION_CACHE_TTL_MS);
      return [];
    }
    const codes = new Set();
    for (const override of overrides) {
      const code = override.permission?.code;
      if (!code || !override.allowed) continue;
      codes.add(code);
    }
    const result = expandModulePermissionCodes([...codes]).sort();
    cacheSet(PERMISSION_CACHE, cacheKey, result, PERMISSION_CACHE_TTL_MS);
    return result;
  }

  const [accountRole, assignedRoles] = await Promise.all([
    prisma.role.findFirst({
      where: {
        tenantId: user.tenantId,
        key: user.accountType,
      },
      include: {
        rolePermissions: {
          include: { permission: { select: { code: true } } },
        },
      },
    }),
    prisma.userRole.findMany({
      where: { tenantId: user.tenantId, userId: user.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: { select: { code: true } } },
            },
          },
        },
      },
    }),
  ]);

  const codes = new Set();
  const addRolePermissions = (role) => {
    for (const rolePermission of role?.rolePermissions || []) {
      if (rolePermission.permission?.code) codes.add(rolePermission.permission.code);
    }
  };

  addRolePermissions(accountRole);
  for (const userRole of assignedRoles) addRolePermissions(userRole.role);

  for (const override of overrides) {
    const code = override.permission?.code;
    if (!code) continue;
    if (override.allowed) codes.add(code);
    else codes.delete(code);
  }

  const result = expandModulePermissionCodes([...codes]).sort();
  cacheSet(PERMISSION_CACHE, cacheKey, result, PERMISSION_CACHE_TTL_MS);
  return result;
}

async function getStoredPermissionState({ tenantId, userId, accountType }) {
  const explicitRows = await prisma.userPermission.findMany({
    where: { tenantId, userId },
    include: { permission: { select: { code: true } } },
    orderBy: { updatedAt: "asc" },
  });

  const savedPermissions = explicitRows
    .filter((row) => row.allowed && row.permission?.code)
    .map((row) => row.permission.code)
    .sort();

  const effectivePermissions = await getEffectivePermissionCodes({
    id: userId,
    tenantId,
    accountType,
  });

  return {
    savedPermissions,
    effectivePermissions,
    hasExplicitPermissions: explicitRows.length > 0,
  };
}

export async function listPermissionCatalog() {
  await ensurePermissionCatalog();
  return prisma.permission.findMany({
    where: { code: { in: ALL_PERMISSION_CODES } },
    select: { id: true, code: true, group: true },
    orderBy: [{ group: "asc" }, { code: "asc" }],
  });
}

export async function listManagedUsers({ tenantId, search = "" }) {
  assertTenantId(tenantId);
  await ensureTenantRbac(tenantId);

  const query = String(search || "").trim();
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      accountType: { in: RBAC_MANAGED_ACCOUNT_TYPES },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phoneNumber: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      phoneNumber: true,
      accountType: true,
      isActive: true,
      updatedAt: true,
    },
    orderBy: [{ accountType: "asc" }, { name: "asc" }],
  });

  const enriched = [];
  for (const user of users) {
    const permissionState = await getStoredPermissionState({
      tenantId: user.tenantId,
      userId: user.id,
      accountType: user.accountType,
    });
    enriched.push({
      ...user,
      permissions: permissionState.hasExplicitPermissions
        ? permissionState.savedPermissions
        : [],
      savedPermissions: permissionState.savedPermissions,
      effectivePermissions: permissionState.effectivePermissions,
      hasExplicitPermissions: permissionState.hasExplicitPermissions,
    });
  }
  return enriched;
}

export async function replaceUserPermissions({
  tenantId,
  targetUserId,
  permissionCodes,
  actorId,
  actorAccountType,
}) {
  assertTenantId(tenantId);
  await ensureTenantRbac(tenantId);

  if (!isPrivilegedAccount(actorAccountType) && actorId && actorId === targetUserId) {
    const error = new Error("You cannot change your own permissions.");
    error.status = 403;
    throw error;
  }

  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      tenantId,
      accountType: { in: RBAC_MANAGED_ACCOUNT_TYPES },
    },
    select: { id: true, tenantId: true, accountType: true },
  });
  if (!target) {
    const error = new Error("Managed Dokan or Finance user was not found.");
    error.status = 404;
    throw error;
  }

  const selected = new Set(normalizePermissionCodes(permissionCodes));
  const permissions = await prisma.permission.findMany({
    where: { code: { in: ALL_PERMISSION_CODES } },
    select: { id: true, code: true },
  });

  await prisma.$transaction([
    prisma.userPermission.deleteMany({
      where: { tenantId, userId: target.id },
    }),
    prisma.userPermission.createMany({
      data: permissions.map((permission) => ({
        tenantId,
        userId: target.id,
        permissionId: permission.id,
        allowed: selected.has(permission.code),
        grantedById: actorId || null,
      })),
      skipDuplicates: true,
    }),
  ]);

  invalidateUserPermissionCache(target.id);

  const permissionState = await getStoredPermissionState({
    userId: target.id,
    tenantId,
    accountType: target.accountType,
  });

  return {
    userId: target.id,
    permissions: permissionState.savedPermissions,
    savedPermissions: permissionState.savedPermissions,
    effectivePermissions: permissionState.effectivePermissions,
    hasExplicitPermissions: true,
  };
}
