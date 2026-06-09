import { getTenantContext, isSuperAdminContext } from "./tenantContext.js";

const TENANT_SCOPED_MODELS = new Set([
  "User",
  "UserNotification",
  "Customer",
  "Order",
  "WorkerPaymentReceipt",
  "OrderDraft",
  "Rakht",
  "RakhtPaymentHistory",
  "RakhtTon",
  "ReadyMadeClothing",
  "ReadyMadeWaskatClothing",
  "Notification",
  "Box",
  "Contributor",
  "DailyTask",
  "Transaction",
  "DamagedClothesPenalty",
  "Item",
  "ItemSale",
]);

const WRITE_OPERATIONS = new Set(["create", "createMany"]);
const WHERE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

function shouldScope(model) {
  return TENANT_SCOPED_MODELS.has(model) && Boolean(getTenantContext()) && !isSuperAdminContext();
}

function currentTenantId() {
  return getTenantContext()?.tenantId || null;
}

function withTenantWhere(args, tenantId) {
  return {
    ...args,
    where: {
      ...(args?.where || {}),
      tenantId,
    },
  };
}

function withTenantFindUniqueWhere(model, args, tenantId) {
  if (model === "Customer") {
    if (args?.where?.billNumber !== undefined) {
      const { billNumber, tenantId: _tenantId, ...rest } = args.where;
      return {
        ...args,
        where: {
          ...rest,
          tenantId_billNumber: { tenantId, billNumber },
        },
      };
    }

  }

  if (model === "ReadyMadeClothing" && args?.where?.clothingCode !== undefined) {
    const { clothingCode, tenantId: _tenantId, ...rest } = args.where;
    return {
      ...args,
      where: {
        ...rest,
        tenantId_clothingCode: { tenantId, clothingCode },
      },
    };
  }

  if (model === "ReadyMadeWaskatClothing" && args?.where?.waskatCode !== undefined) {
    const { waskatCode, tenantId: _tenantId, ...rest } = args.where;
    return {
      ...args,
      where: {
        ...rest,
        tenantId_waskatCode: { tenantId, waskatCode },
      },
    };
  }

  if (model === "Item" && args?.where?.code !== undefined) {
    const { code, tenantId: _tenantId, ...rest } = args.where;
    return {
      ...args,
      where: {
        ...rest,
        tenantId_code: { tenantId, code },
      },
    };
  }

  return withTenantWhere(args, tenantId);
}

function withTenantData(args, tenantId) {
  if (Array.isArray(args?.data)) {
    return {
      ...args,
      data: args.data.map((entry) => ({ ...entry, tenantId: entry.tenantId || tenantId })),
    };
  }

  return {
    ...args,
    data: {
      ...(args?.data || {}),
      tenantId: args?.data?.tenantId || tenantId,
    },
  };
}

export async function tenantScopeQuery({ model, operation, args, query }) {
  if (!shouldScope(model)) {
    return query(args);
  }

  const tenantId = currentTenantId();
  if (!tenantId) {
    throw new Error(`Tenant context is required for ${model}.${operation}.`);
  }

  if (WRITE_OPERATIONS.has(operation)) {
    return query(withTenantData(args, tenantId));
  }

  if (operation === "upsert") {
    return query({
      ...args,
      where: {
        ...(args?.where || {}),
        tenantId: args?.where?.tenantId || tenantId,
      },
      create: {
        ...(args?.create || {}),
        tenantId: args?.create?.tenantId || tenantId,
      },
    });
  }

  if (operation === "findUnique" || operation === "findUniqueOrThrow") {
    return query(withTenantFindUniqueWhere(model, args, tenantId));
  }

  if (WHERE_OPERATIONS.has(operation)) {
    return query(withTenantWhere(args, tenantId));
  }

  return query(args);
}
