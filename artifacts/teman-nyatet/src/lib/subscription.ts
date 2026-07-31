import { apiGet } from './apiClient';

export type SubscriptionStatus = 'pending' | 'active' | 'archived';
export type PaymentPlan = 'monthly' | 'yearly';
export type PaymentOrderStatus = 'pending' | 'completed' | 'failed' | 'expired';

export interface SubscriptionHistoryItem {
  order_id: string;
  plan: PaymentPlan;
  amount: number;
  currency: 'IDR';
  status: PaymentOrderStatus;
  created_at: string;
  completed_at: string | null;
  payment_id: string | null;
  receipt_url: string | null;
  payment_link_url: string | null;
}

export interface SubscriptionOverview {
  profile: {
    status: SubscriptionStatus;
    plan: PaymentPlan | null;
    started_at: string | null;
    ends_at: string | null;
    days_remaining: number | null;
    payment_method: string | null;
  };
  features: string[];
  history: SubscriptionHistoryItem[];
  credits: {
    balance: number;
    purchased: number;
    used: number;
  };
}

export async function getSubscriptionOverview(): Promise<SubscriptionOverview> {
  return apiGet<SubscriptionOverview>('/subscription/overview');
}

export function formatSubscriptionDate(value: string | null): string {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum tersedia';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatSubscriptionDateTime(value: string | null): string {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum tersedia';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function planLabel(plan: PaymentPlan | null): string {
  if (plan === 'monthly') return 'Paket Bulanan';
  if (plan === 'yearly') return 'Paket Tahunan';
  return 'Belum berlangganan';
}

export function statusLabel(status: SubscriptionStatus | PaymentOrderStatus): string {
  const labels: Record<SubscriptionStatus | PaymentOrderStatus, string> = {
    pending: 'Menunggu pembayaran',
    active: 'Aktif',
    archived: 'Berakhir',
    completed: 'Berhasil',
    failed: 'Gagal',
    expired: 'Kedaluwarsa',
  };
  return labels[status];
}