import { apiPost } from './apiClient';

export type PaymentPlan = 'monthly' | 'yearly';

export type PaymentCheckout = {
  order_id: string;
  payment_link_url: string;
  expires_at: string | null;
  plan: PaymentPlan;
  amount: number;
};

function paymentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Payment Sandbox')) return 'Pembayaran sedang disiapkan. Coba lagi nanti.';
  if (message.includes('tidak tersedia')) return message;
  if (message.includes('NETWORK_ERROR')) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
  if (message.includes('401')) return 'Sesi login sudah berakhir. Silakan masuk lagi.';
  return 'Gagal menyiapkan pembayaran. Coba lagi.';
}

export async function createPaymentCheckout(plan: PaymentPlan): Promise<PaymentCheckout> {
  try {
    return await apiPost<PaymentCheckout>('/payment/create', { plan });
  } catch (error) {
    throw new Error(paymentErrorMessage(error));
  }
}

export async function openPaymentCheckout(plan: PaymentPlan): Promise<void> {
  const checkoutWindow = window.open('about:blank', '_blank');
  if (!checkoutWindow) {
    throw new Error('Popup checkout diblokir browser. Izinkan popup lalu coba lagi.');
  }

  try {
    const checkout = await createPaymentCheckout(plan);
    checkoutWindow.location.href = checkout.payment_link_url;
  } catch (error) {
    checkoutWindow.close();
    throw error;
  }
}