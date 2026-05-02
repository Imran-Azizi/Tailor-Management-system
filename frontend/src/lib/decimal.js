import Decimal from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 20,
});

export const MONEY_SCALE = 2;
export const METER_SCALE = 2;

export const toDecimal = (value) => {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
};

export const toScaledNumber = (value, scale = MONEY_SCALE) =>
  toDecimal(value).toDecimalPlaces(scale).toNumber();

export const addScaled = (a, b, scale = MONEY_SCALE) =>
  toScaledNumber(toDecimal(a).plus(toDecimal(b)), scale);

export const subScaled = (a, b, scale = MONEY_SCALE) =>
  toScaledNumber(toDecimal(a).minus(toDecimal(b)), scale);

export const mulScaled = (a, b, scale = MONEY_SCALE) =>
  toScaledNumber(toDecimal(a).times(toDecimal(b)), scale);

export const divScaled = (a, b, scale = MONEY_SCALE) => {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return 0;
  return toScaledNumber(toDecimal(a).div(divisor), scale);
};

export const maxScaled = (a, b, scale = MONEY_SCALE) =>
  toScaledNumber(Decimal.max(toDecimal(a), toDecimal(b)), scale);

export const formatScaled = (
  value,
  { scale = METER_SCALE, trim = true } = {},
) => {
  const fixed = toDecimal(value).toDecimalPlaces(scale).toFixed(scale);
  if (!trim) return fixed;
  return fixed.replace(/\.?0+$/, "");
};
