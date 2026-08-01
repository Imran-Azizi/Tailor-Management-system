export function collectMeasurementValues(setValue = {}, measurementFields = []) {
  const copiedValues = {};

  for (const [fieldKey] of measurementFields) {
    if (Object.prototype.hasOwnProperty.call(setValue, fieldKey)) {
      copiedValues[fieldKey] = setValue[fieldKey];
    }
  }

  return copiedValues;
}

export function applyMeasurementValues(currentSet = {}, copiedValues = {}, measurementFields = []) {
  const nextSet = { ...currentSet };

  for (const [fieldKey] of measurementFields) {
    if (Object.prototype.hasOwnProperty.call(copiedValues, fieldKey)) {
      nextSet[fieldKey] = copiedValues[fieldKey];
    }
  }

  return nextSet;
}
