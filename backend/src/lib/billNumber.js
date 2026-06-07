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
  const result = await db.customer.aggregate({
    _max: { billNumber: true },
  });
  const currentMax = Number(result?._max?.billNumber || 0);
  return Number.isFinite(currentMax) && currentMax >= BILL_NUMBER_START
    ? currentMax + 1
    : BILL_NUMBER_START;
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
