import type { TransactionType } from '@/lib/database.types';
import type { ParsedTransactionVoice } from '@/lib/transaction-voice-parser';

export const APP_EVENTS = {
  openBottomSheet: 'teman-nyatet:open-bottom-sheet',
  openSettingsSubscription: 'teman-nyatet:open-settings-subscription',
  openSettingsTopUp: 'teman-nyatet:open-settings-topup',
  freePlanLimitReached: 'teman-nyatet:free-plan-limit-reached',
} as const;

export type BottomSheetRequest = {
  transactionType?: TransactionType;
  voiceTranscript?: string;
  voiceTransaction?: ParsedTransactionVoice;
};

export type FreePlanLimitRequest = {
  resource: 'notes' | 'transactions';
  limit: number;
};

function dispatch<T>(name: string, detail?: T, options?: CustomEventInit<T>) {
  window.dispatchEvent(new CustomEvent(name, { ...options, detail }));
}

export function requestBottomSheet(detail?: BottomSheetRequest) {
  dispatch(APP_EVENTS.openBottomSheet, detail);
}

export function requestSettingsSubscription() {
  dispatch(APP_EVENTS.openSettingsSubscription, undefined, { cancelable: true });
}

export function requestSettingsTopUp() {
  dispatch(APP_EVENTS.openSettingsTopUp);
}

export function requestFreePlanLimitDialog(detail: FreePlanLimitRequest) {
  dispatch(APP_EVENTS.freePlanLimitReached, detail);
}

export function subscribeToAppEvent<T>(
  name: string,
  handler: (event: CustomEvent<T>) => void,
) {
  const listener = (event: Event) => handler(event as CustomEvent<T>);
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}