import {
  MONEY_SCALE,
  subScaled,
  toNumberScaled,
} from "./decimal.js";

export const getOrderGrossTotal = (order) =>
  toNumberScaled(order?.totalPrice || 0, MONEY_SCALE);

export const getOrderDiscount = (order) =>
  Math.max(0, toNumberScaled(order?.discount || 0, MONEY_SCALE));

export const getOrderNetTotal = (order) =>
  Math.max(
    0,
    subScaled(
      getOrderGrossTotal(order),
      getOrderDiscount(order),
      MONEY_SCALE,
    ),
  );

export const getOrderPaidAmount = (order) =>
  Math.max(0, toNumberScaled(order?.paidAmount || 0, MONEY_SCALE));

export const getOrderFinancialTotal = (order) => getOrderNetTotal(order);

export const getOrderFinancialPaid = (order) => getOrderPaidAmount(order);

export const getOrderFinancialRemaining = (order) =>
  Math.max(
    0,
    subScaled(
      getOrderFinancialTotal(order),
      getOrderFinancialPaid(order),
      MONEY_SCALE,
    ),
  );

export const getAggregateNetTotal = (aggregate) =>
  Math.max(
    0,
    subScaled(
      aggregate?._sum?.totalPrice || 0,
      aggregate?._sum?.discount || 0,
      MONEY_SCALE,
    ),
  );
