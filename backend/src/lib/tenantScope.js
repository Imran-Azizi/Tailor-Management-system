import { getTenantContext, isSuperAdminContext } from "./tenantContext.js";

const TENANT_SCOPED_MODELS = new Set([
  "User",
  "UserNotification",
  "Customer",
  "Order",
  "Outfit",
  "Waskat",
  "Korty",
  "YakhanQaq",
  "ReadyMadeOrder",
  "ReadyMadeWaskatOrder",
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
  "AuditLog",
  "Yakhan",
  "Astin",
  "ShoulderState",
  "NeckOutfit",
  "NeckWaskat",
  "Daman",
  "JibRow",
  "JibBaghle",
  "JibTenban",
  "PatyShip",
  "ButtonShip",
  "TenbanShip",
  "OutfitDesign",
  "YakhanQaqNeck",
  "YakhanQaqSleeve",
  "YakhanQaqSkirt",
  "YakhanQaqDesignOption",
  "YakhanQaqButtonShip",
  "YakhanQaqPantShip",
]);

const TENANT_NAMED_MODELS = new Set([
  "Yakhan",
  "Astin",
  "ShoulderState",
  "NeckOutfit",
  "NeckWaskat",
  "Daman",
  "JibRow",
  "JibBaghle",
  "JibTenban",
  "PatyShip",
  "ButtonShip",
  "TenbanShip",
  "OutfitDesign",
  "YakhanQaqNeck",
  "YakhanQaqSleeve",
  "YakhanQaqSkirt",
  "YakhanQaqDesignOption",
  "YakhanQaqButtonShip",
  "YakhanQaqPantShip",
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
  if (TENANT_NAMED_MODELS.has(model) && args?.where?.name !== undefined) {
    const { name, tenantId: _tenantId, ...rest } = args.where;
    return {
      ...args,
      where: {
        ...rest,
        tenantId_name: { tenantId, name },
      },
    };
  }

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
      data: args.data.map((entry) => ({ ...entry, tenantId })),
    };
  }

  return {
    ...args,
    data: {
      ...(args?.data || {}),
      tenantId,
    },
  };
}

function withTenantUpsertArgs(model, args, tenantId) {
  const where =
    TENANT_NAMED_MODELS.has(model) && args?.where?.name !== undefined
      ? {
          ...Object.fromEntries(
            Object.entries(args.where || {}).filter(
              ([key]) => key !== "name" && key !== "tenantId",
            ),
          ),
          tenantId_name: { tenantId, name: args.where.name },
        }
      : args?.where || {};

  return {
    ...args,
    where,
    create: {
      ...(args?.create || {}),
      tenantId,
    },
    update: {
      ...(args?.update || {}),
      tenantId,
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
    return query(withTenantUpsertArgs(model, args, tenantId));
  }

  if (operation === "findUnique" || operation === "findUniqueOrThrow") {
    return query(withTenantFindUniqueWhere(model, args, tenantId));
  }

  if (WHERE_OPERATIONS.has(operation)) {
    return query(withTenantWhere(args, tenantId));
  }

  return query(args);
}
