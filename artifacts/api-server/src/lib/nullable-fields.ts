export function nullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

export function normalizeStoredNullableText(value: unknown): string | null {
  if (value === null || value === undefined || value === 'null') return null;
  return String(value);
}