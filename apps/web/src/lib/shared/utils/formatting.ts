export const formatCurrency = (fractional: number, currency: "USD" = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(fractional / 100);
};
