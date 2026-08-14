/**
 * Transaction dates can come as YYYY-MM-DD or as an ISO timestamp from
 * PostgreSQL. Keep date-only filtering stable in both cases by normalizing
 * to a local midday Date.
 */
export function transactionDateValue(value: string): Date {
  const dateOnly = value.slice(0, 10);
  return new Date(`${dateOnly}T12:00:00`);
}