export function formatCurrency(value: string | number) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(numericValue);
}

export function formatDate(value?: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getPaymentRequestStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "In attesa";
    case "checkout_created":
      return "Link generato";
    case "paid":
      return "Pagato";
    case "overdue":
      return "Scaduto";
    case "cancelled":
      return "Annullato";
    case "expired":
      return "Scaduto";
    default:
      return status;
  }
}

export function getPaymentRequestStatusClasses(status: string) {
  switch (status) {
    case "paid":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
    case "checkout_created":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "overdue":
    case "cancelled":
    case "expired":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }
}

export function getPaymentProviderLabel(
  provider?: string | null,
  providerRef?: string | null
) {
  if (provider === "stripe") {
    return "Online Stripe";
  }

  if (provider === "manual") {
    if (providerRef === "cash") return "Manuale · Contanti";
    if (providerRef === "bank_transfer") return "Manuale · Bonifico";
    if (providerRef === "pos") return "Manuale · POS";
    return "Manuale";
  }

  return provider || "—";
}

export function getPaymentProviderClasses(provider?: string | null) {
  if (provider === "stripe") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (provider === "manual") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  return "border-neutral-700 bg-neutral-800 text-neutral-300";
}