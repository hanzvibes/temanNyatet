export const FREE_PLAN_LIMIT = 3;

export type LimitedFreeEntity = 'notes' | 'transactions';

export class FreePlanLimitError extends Error {
  constructor(
    public readonly entity: LimitedFreeEntity,
    public readonly limit: number = FREE_PLAN_LIMIT,
  ) {
    super('FREE_PLAN_LIMIT_REACHED');
    this.name = 'FreePlanLimitError';
  }
}