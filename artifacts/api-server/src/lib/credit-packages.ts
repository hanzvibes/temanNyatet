export type CreditPackageId = 'credit_100' | 'credit_300' | 'credit_700' | 'credit_1500';

export type CreditPackage = {
  id: CreditPackageId;
  credits: number;
  amount: number;
};

export const CREDIT_PACKAGES: Record<CreditPackageId, CreditPackage> = {
  credit_100: { id: 'credit_100', credits: 100, amount: 10_000 },
  credit_300: { id: 'credit_300', credits: 300, amount: 25_000 },
  credit_700: { id: 'credit_700', credits: 700, amount: 50_000 },
  credit_1500: { id: 'credit_1500', credits: 1_500, amount: 100_000 },
};

export function getCreditPackage(value: unknown): CreditPackage | null {
  if (typeof value !== 'string') return null;
  return CREDIT_PACKAGES[value as CreditPackageId] ?? null;
}