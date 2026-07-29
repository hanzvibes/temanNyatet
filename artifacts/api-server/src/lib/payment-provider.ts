export type CreditPurchase = {
  userEmail: string;
  credits: number;
  referenceId: string;
};

export interface PaymentProvider {
  parseSuccessfulCreditPurchase(
    payload: Record<string, unknown>,
  ): CreditPurchase | null;
}

/**
 * Mayar's payload shape is intentionally kept at this boundary. When Mayar
 * changes its event schema, only this adapter should need updating.
 */
export class MayarPaymentProvider implements PaymentProvider {
  parseSuccessfulCreditPurchase(payload: Record<string, unknown>): CreditPurchase | null {
    const event = String(payload.event ?? '');
    if (!['payment.success', 'order.completed', 'invoice.paid'].includes(event)) return null;
    const data = (payload.data as Record<string, unknown>) ?? {};
    const userEmail = String(data.customer_email ?? '').trim().toLowerCase();
    const referenceId = String(data.id ?? data.payment_id ?? payload.id ?? '').trim();
    const credits = Number(data.credits ?? data.credit_amount ?? 0);
    if (!userEmail || !referenceId || !Number.isInteger(credits) || credits <= 0) return null;
    return { userEmail, credits, referenceId };
  }
}