import { formatIDR } from '@/lib/format';

export interface PriceLabelInput {
  isPro: boolean;
  price: number;
  yearly: number;
  annual: boolean;
}

export interface PriceLabel {
  amount: string;
  period: string;
}

/** Label harga kartu pricing: Free selalu "Rp 0 · selamanya", Pro mengikuti billing. */
export function getPriceLabel({ isPro, price, yearly, annual }: PriceLabelInput): PriceLabel {
  if (!isPro) return { amount: 'Rp 0', period: 'selamanya' };
  const value = annual ? yearly : price;
  return {
    amount: formatIDR(value),
    period: annual ? '/ tahun' : '/ bulan',
  };
}
