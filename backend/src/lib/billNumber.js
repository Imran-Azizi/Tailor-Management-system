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

export const getNextSequentialBillNumber = async (db) => {
  const existing = await db.customer.findMany({
    select: { billNumber: true },
    orderBy: { billNumber: "asc" },
  });

  let next = BILL_NUMBER_START;
  for (const row of existing) {
    const current = Number(row?.billNumber || 0);
    if (!Number.isFinite(current) || current < next) {
      continue;
    }
    if (current === next) {
      next += 1;
      continue;
    }
    break;
  }

  return next;
};

export const createCustomerWithSequentialBill = async (
  db,
  customerData,
  { maxRetries = BILL_NUMBER_MAX_RETRIES } = {},
) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const billNumber = await getNextSequentialBillNumber(db);

    try {
      return await db.customer.create({
        data: {
          ...customerData,
          billNumber,
        },
      });
    } catch (error) {
      if (isBillNumberConflictError(error) && attempt < maxRetries) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to allocate a unique sequential bill number.");
};
