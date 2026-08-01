/**
 * Transaction dates can come from Google Sheets as YYYY-MM-DD or from
 * PostgreSQL as an ISO timestamp. Keep date-only filtering stable in both
 * cases by normalizing to a local midday Date.
 */
export function transactionDateValue(value: string): Date {
  const dateOnly = value.slice(0, 10);
  return new Date(`${dateOnly}T12:00:00`);
}