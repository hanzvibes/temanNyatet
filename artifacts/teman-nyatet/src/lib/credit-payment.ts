import { apiPost } from './apiClient';

export type CreditPackageId = 'credit_100' | 'credit_300' | 'credit_700' | 'credit_1500';

export type CreditPaymentCheckout = {
  order_id: string;
  payment_link_url: string;
  expires_at: string | null;
  package_id: CreditPackageId;
  credits: number;
  amount: number;
};

function creditPaymentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Payment Sandbox')) return 'Pembayaran sedang disiapkan. Coba lagi nanti.';
  if (message.includes('tidak tersedia')) return message;
  if (message.includes('Paket credit')) return 'Paket credit tidak valid.';
  if (message.includes('NETWORK_ERROR')) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
  if (message.includes('401')) return 'Sesi login sudah berakhir. Silakan masuk lagi.';
  return 'Gagal menyiapkan pembayaran credit. Coba lagi.';
}

export async function createCreditPaymentCheckout(
  packageId: CreditPackageId,
): Promise<CreditPaymentCheckout> {
  try {
    return await apiPost<CreditPaymentCheckout>('/credits/topup/create', {
      package_id: packageId,
    });
  } catch (error) {
    throw new Error(creditPaymentErrorMessage(error));
  }
}

export async function openCreditPaymentCheckout(packageId: CreditPackageId): Promise<void> {
  const checkoutWindow = window.open('about:blank', '_blank');
  if (!checkoutWindow) {
    throw new Error('Popup checkout diblokir browser. Izinkan popup lalu coba lagi.');
  }

  try {
    const checkout = await createCreditPaymentCheckout(packageId);
    checkoutWindow.location.href = checkout.payment_link_url;
  } catch (error) {
    checkoutWindow.close();
    throw error;
  }
}