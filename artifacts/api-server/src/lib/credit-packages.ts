export type CreditPackageId = 'credit_100' | 'credit_500' | 'credit_1000' | 'credit_5000' | 'credit_10000';

export type CreditPackage = {
  id: CreditPackageId;
  credits: number;
  amount: number;
};

export const CREDIT_PACKAGES: Record<CreditPackageId, CreditPackage> = {
  credit_100: { id: 'credit_100', credits: 100, amount: 25_000 },
  credit_500: { id: 'credit_500', credits: 500, amount: 110_000 },
  credit_1000: { id: 'credit_1000', credits: 1_000, amount: 200_000 },
  credit_5000: { id: 'credit_5000', credits: 5_000, amount: 900_000 },
  credit_10000: { id: 'credit_10000', credits: 10_000, amount: 1_800_000 },
};

export function getCreditPackage(value: unknown): CreditPackage | null {
  if (typeof value !== 'string') return null;
  return CREDIT_PACKAGES[value as CreditPackageId] ?? null;
}