export interface StorageQuotaErrorDetails {
  rawMessage: string;
  usedBytes: number | null;
  limitBytes: number | null;
  usedLabel: string | null;
  limitLabel: string | null;
  usageLabel: string | null;
}

const BYTES_PER_MB = 1024 * 1024;

export function formatStorageBytes(bytes: number): string {
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

function parseByteValue(message: string, label: "Used" | "Limit"): number | null {
  const match = new RegExp(`${label}:\\s*([\\d,]+)\\s*bytes`, "i").exec(message);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(value) ? value : null;
}

export function parseStorageQuotaError(message: string): StorageQuotaErrorDetails | null {
  if (!/\b402\b/.test(message) || !/quota/i.test(message)) return null;

  const usedBytes = parseByteValue(message, "Used");
  const limitBytes = parseByteValue(message, "Limit");
  const usedLabel = usedBytes === null ? null : formatStorageBytes(usedBytes);
  const limitLabel = limitBytes === null ? null : formatStorageBytes(limitBytes);

  return {
    rawMessage: message,
    usedBytes,
    limitBytes,
    usedLabel,
    limitLabel,
    usageLabel: usedLabel && limitLabel ? `${usedLabel} of ${limitLabel}` : null,
  };
}
