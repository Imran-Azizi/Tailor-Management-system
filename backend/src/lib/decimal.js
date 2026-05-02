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

export const toNumberScaled = (value, scale = MONEY_SCALE) =>
  toDecimal(value).toDecimalPlaces(scale).toNumber();

export const addScaled = (a, b, scale = MONEY_SCALE) =>
  toNumberScaled(toDecimal(a).plus(toDecimal(b)), scale);

export const subScaled = (a, b, scale = MONEY_SCALE) =>
  toNumberScaled(toDecimal(a).minus(toDecimal(b)), scale);

export const mulScaled = (a, b, scale = MONEY_SCALE) =>
  toNumberScaled(toDecimal(a).times(toDecimal(b)), scale);

export const divScaled = (a, b, scale = MONEY_SCALE) => {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return 0;
  return toNumberScaled(toDecimal(a).div(divisor), scale);
};

export const maxScaled = (a, b, scale = MONEY_SCALE) =>
  toNumberScaled(Decimal.max(toDecimal(a), toDecimal(b)), scale);

export const sumScaled = (values = [], scale = MONEY_SCALE) =>
  toNumberScaled(
    values.reduce((acc, value) => acc.plus(toDecimal(value)), new Decimal(0)),
    scale,
  );

export const decimalLt = (a, b) => toDecimal(a).lt(toDecimal(b));
