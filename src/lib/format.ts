export function formatAmount(value: number | bigint, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits
  }).format(Number(value));
}

export function formatRelativeDate(timestamp: number) {
  if (!timestamp) {
    return "Not updated yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp * 1000));
}

export function truncateAddress(value: string) {
  if (!value) {
    return "Not connected";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Something went wrong";
}

