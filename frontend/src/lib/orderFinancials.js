const toFiniteAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
};

export const getOrderGrossTotal = (order) =>
  Math.max(0, toFiniteAmount(order?.totalPrice));

export const getOrderDiscount = (order) =>
  Math.max(0, toFiniteAmount(order?.discount));

export const getOrderNetTotal = (order) =>
  Math.max(0, getOrderGrossTotal(order) - getOrderDiscount(order));

export const getOrderPaidAmount = (order) =>
  Math.max(0, toFiniteAmount(order?.paidAmount));

export const getOrderFinancialTotal = (order) => getOrderNetTotal(order);

export const getOrderFinancialPaid = (order) => getOrderPaidAmount(order);

export const getOrderFinancialRemaining = (order) =>
  Math.max(0, getOrderFinancialTotal(order) - getOrderFinancialPaid(order));
