// Small, dependency-free request validation helpers shared by the data
// routes (notes/todos/links/transactions). Google Sheets has no schema
// enforcement of its own, so the API is the only place bounding what gets
// written — these guard against oversized payloads and wrong-typed fields
// slipping through as raw strings into the sheet.

export class ValidationError extends Error {}

export function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is required and must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

export function optionalString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or fewer`);
  }
  return value;
}

export function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function optionalTags(value: unknown, maxItems = 20, maxLength = 50): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError('tags must be an array of strings');
  if (value.length > maxItems) throw new ValidationError(`tags must have ${maxItems} items or fewer`);
  return value.map((tag, i) => {
    if (typeof tag !== 'string' || tag.length > maxLength) {
      throw new ValidationError(`tags[${i}] must be a string of ${maxLength} characters or fewer`);
    }
    return tag;
  });
}

export function optionalBoolean(value: unknown, field: string): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'boolean') throw new ValidationError(`${field} must be a boolean`);
  return value;
}

// Only allows http(s) URLs — rejects javascript:, data:, and other schemes
// that could turn a saved "link" into a self-XSS/social-engineering vector
// if the frontend ever renders it as a clickable anchor.
export function requireHttpUrl(value: unknown, field: string, maxLength = 2000): string {
  const str = requireString(value, field, maxLength);
  let parsed: URL;
  try {
    parsed = new URL(str);
  } catch {
    throw new ValidationError(`${field} must be a valid URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError(`${field} must use http or https`);
  }
  return str;
}
