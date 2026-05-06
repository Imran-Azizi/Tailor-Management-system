export function getMeasurementFieldLabel(t, label) {
  return t(`createOrder.fields.${label}`);
}

export function getStyleFieldLabel(t, label) {
  return t(`createOrder.styleFields.${label}`, {
    defaultValue: getMeasurementFieldLabel(t, label),
  });
}
