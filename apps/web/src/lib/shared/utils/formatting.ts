export const formatCurrency = (fractional: number, currency: "USD" = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(fractional / 100);
};

export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
};
