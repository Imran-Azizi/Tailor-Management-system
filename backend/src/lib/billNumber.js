import { getTenantContext } from "./tenantContext.js";

export const BILL_NUMBER_START = 1;

const BILL_NUMBER_MAX_RETRIES = 8;

const hasBillNumberTarget = (target) => {
  if (Array.isArray(target)) {
    return target.some((entry) =>
      String(entry).toLowerCase().includes("billnumber"),
    );
  }
  return String(target || "")
    .toLowerCase()
    .includes("billnumber");
};

const isBillNumberConflictError = (error) =>
  error?.code === "P2002" && hasBillNumberTarget(error?.meta?.target);

function resolveTenantId(explicitTenantId = null) {
  return explicitTenantId || getTenantContext()?.tenantId || null;
}

export const getNextSequentialBillNumber = async (db, { tenantId: explicitTenantId = null } = {}) => {
  const tenantId = resolveTenantId(explicitTenantId);
  const where = tenantId ? { tenantId } : undefined;
  const [customerResult, orderResult] = await Promise.all([
    db.customer.aggregate({
      where,
      _max: { billNumber: true },
    }),
    db.order.aggregate({
      where,
      _max: { billNumber: true },
    }),
  ]);
  const currentMax = Math.max(
    Number(customerResult?._max?.billNumber || 0),
    Number(orderResult?._max?.billNumber || 0),
  );
  return Number.isFinite(currentMax) && currentMax >= BILL_NUMBER_START
    ? currentMax + 1
    : BILL_NUMBER_START;
};

export const createCustomerWithSequentialBill = async (
  db,
  customerData,
  { maxRetries = BILL_NUMBER_MAX_RETRIES, tenantId: explicitTenantId = null } = {},
) => {
  const tenantId = resolveTenantId(explicitTenantId || customerData?.tenantId);
  if (!tenantId) {
    throw Object.assign(new Error("Tenant context is required to create a customer."), {
      status: 403,
    });
  }

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const billNumber = await getNextSequentialBillNumber(db, { tenantId });

    try {
      return await db.customer.create({
        data: {
          ...customerData,
          tenantId,
          billNumber,
        },
      });
    } catch (error) {
      if (
        isBillNumberConflictError(error) &&
        attempt < maxRetries &&
        typeof db?.$transaction === "function"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to allocate a unique sequential bill number.");
};
