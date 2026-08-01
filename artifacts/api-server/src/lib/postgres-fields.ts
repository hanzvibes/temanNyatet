const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: Date): Date {
  if (Number.isNaN(value.getTime())) {
    throw new Error('value must be a valid date');
  }
  return value;
}

export function parseApiDateTime(value: unknown): Date {
  if (value instanceof Date) return validDate(new Date(value.getTime()));
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('value must be a valid date');
  }

  const input = value.trim();
  if (DATE_ONLY.test(input)) {
    const parsed = new Date(`${input}T00:00:00.000Z`);
    if (parsed.toISOString().slice(0, 10) !== input) {
      throw new Error('value must be a valid date');
    }
    return parsed;
  }

  return validDate(new Date(input));
}

export function serializeTodoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const parsed = parseApiDateTime(value);
    return parsed.toISOString().slice(0, 10);
  }
  return parseApiDateTime(value).toISOString().slice(0, 10);
}

export function coerceApiBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return false;
}

export function coerceApiNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}