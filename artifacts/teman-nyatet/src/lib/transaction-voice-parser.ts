import type { TransactionType } from '@/lib/database.types';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type TransactionFormValues,
} from './transactions.js';

export interface ParsedTransactionVoice {
  type?: TransactionType;
  amount?: string;
  category?: string;
  note?: string;
  source?: string;
  date?: string;
}

interface AmountMatch {
  value: number;
  text: string;
  score: number;
}

const NUMBER_WORDS: Record<string, number> = {
  nol: 0,
  satu: 1,
  seorang: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
  seribu: 1000,
  sejuta: 1_000_000,
};

const NUMBER_SCALES: Record<string, number> = {
  puluh: 10,
  ratus: 100,
  ribu: 1_000,
  rb: 1_000,
  juta: 1_000_000,
  jt: 1_000_000,
  miliar: 1_000_000_000,
  milyar: 1_000_000_000,
  m: 1_000_000,
};

const MONTHS: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  agt: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
};

const TYPE_KEYWORDS: Array<{ type: TransactionType; words: string[] }> = [
  {
    type: 'expense',
    words: ['pengeluaran', 'keluar', 'bayar', 'beli', 'belanja', 'biaya'],
  },
  {
    type: 'income',
    words: ['pemasukan', 'masuk', 'terima', 'menerima', 'dapat', 'pendapatan'],
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Makanan: ['makan', 'makanan', 'sarapan', 'siang', 'malam', 'kopi', 'minum', 'restoran', 'warteg', 'kuliner'],
  Transport: ['transport', 'bensin', 'bbm', 'ojek', 'gojek', 'grab', 'taksi', 'taxi', 'parkir', 'tol', 'bus', 'kereta'],
  Belanja: ['belanja', 'baju', 'pakaian', 'supermarket', 'belanjaan', 'shopping', 'toko'],
  Tagihan: ['tagihan', 'listrik', 'air', 'internet', 'wifi', 'pulsa', 'sewa', 'cicilan'],
  Kesehatan: ['kesehatan', 'obat', 'dokter', 'rumah sakit', 'apotek', 'vitamin'],
  Hiburan: ['hiburan', 'nonton', 'film', 'game', 'konser', 'musik', 'netflix'],
  Pendidikan: ['pendidikan', 'sekolah', 'kuliah', 'buku', 'kursus', 'les'],
  Gaji: ['gaji', 'salary', 'payroll'],
  Freelance: ['freelance', 'proyek', 'project', 'honor'],
  Bisnis: ['bisnis', 'usaha', 'penjualan', 'jualan', 'omzet'],
  Investasi: ['investasi', 'saham', 'reksadana', 'deposito'],
  Hadiah: ['hadiah', 'kado', 'angpao'],
};

const SOURCE_KEYWORDS: Array<{ source: string; pattern: RegExp }> = [
  { source: 'Mandiri', pattern: /\bmandiri\b/i },
  { source: 'QRIS', pattern: /\bqris\b/i },
  { source: 'E-Wallet', pattern: /\be[\s-]?wallet\b|\be wallet\b/i },
  { source: 'GoPay', pattern: /\bgo\s*pay\b/i },
  { source: 'BCA', pattern: /\bbca\b/i },
  { source: 'BRI', pattern: /\bbri\b/i },
  { source: 'BNI', pattern: /\bbni\b/i },
  { source: 'OVO', pattern: /\bovo\b/i },
  { source: 'Dana', pattern: /\bdana\b/i },
  { source: 'Transfer', pattern: /\btransfer\b/i },
  { source: 'Debit', pattern: /\b(?:debit|kartu debit)\b/i },
  { source: 'Cash', pattern: /\b(?:cash|tunai)\b/i },
];

function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase('id-ID')
    .replace(/[“”"'`]/g, '')
    .replace(/[^\p{L}\p{N},./-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // SpeechRecognition may transcribe "20rb" as "20 rb". Keep monetary
    // units attached so the digit parser treats the pair as one amount.
    .replace(
      /(\d(?:[\d.,]*\d)?)\s+(ribu|rb|juta|jt|miliar|milyar|m)\b/gi,
      '$1$2',
    );
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(?:^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`, 'i').test(text);
}

function formatAmountInput(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(value));
}

function parseWordNumber(tokens: string[]): number {
  let total = 0;
  let current = 0;

  for (const token of tokens) {
    if (token === 'belas') {
      current += 10;
      continue;
    }

    const unit = NUMBER_WORDS[token];
    if (unit !== undefined) {
      current += unit;
      continue;
    }

    const scale = NUMBER_SCALES[token];
    if (scale === undefined) continue;

    if (scale < 1_000) {
      if (scale === 10 && current >= 100) {
        const hundreds = Math.floor(current / 100) * 100;
        const remainder = current % 100;
        current = hundreds + (remainder || 1) * scale;
      } else {
        current = (current || 1) * scale;
      }
    } else {
      total += (current || 1) * scale;
      current = 0;
    }
  }

  return total + current;
}

function parseDigitNumber(raw: string, scale = 1): number {
  const separatorCount = (raw.match(/[.,]/g) ?? []).length;
  const decimalLike = separatorCount === 1 && /\d[.,]\d{1,2}$/.test(raw);
  const numeric = decimalLike
    ? Number(raw.replace(',', '.'))
    : Number(raw.replace(/[^\d]/g, ''));
  return Number.isFinite(numeric) ? numeric * scale : 0;
}

function findDigitAmount(text: string): AmountMatch | undefined {
  const matches = Array.from(
    text.matchAll(/(?<![\w/])(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(ribu|rb|juta|jt|miliar|milyar|m)?\b/gi),
  );
  const candidates: AmountMatch[] = [];

  for (const match of matches) {
    const raw = match[1];
    const unit = match[2]?.toLocaleLowerCase('id-ID');
    const before = text.slice(Math.max(0, (match.index ?? 0) - 28), match.index ?? 0);
    const after = text.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 8);
    if (
      /[/-]\s*$/.test(before)
      || /^\s*[/-]/.test(after)
      || /\b(?:tanggal|tgl|hari)\s*$/.test(before)
      || Object.keys(MONTHS).some((month) => new RegExp(`^\\s*${month}\\b`, 'i').test(after))
    ) continue;

    const score = (unit ? 8 : 0)
      + (/\b(?:nominal|sebesar|harga|uang|bayar)\s*$/.test(before) ? 5 : 0)
      + (raw.replace(/[^\d]/g, '').length >= 4 ? 2 : 0);
    const scale = unit ? NUMBER_SCALES[unit] ?? 1 : 1;
    const value = parseDigitNumber(raw, scale);
    if (value > 0) candidates.push({ value, text: match[0], score });
  }

  return candidates.sort((a, b) => b.score - a.score)[0];
}

function findWordAmount(text: string): AmountMatch | undefined {
  const tokens = text.split(' ');
  const candidates: AmountMatch[] = [];

  for (let start = 0; start < tokens.length; start += 1) {
    if (NUMBER_WORDS[tokens[start]] === undefined && NUMBER_SCALES[tokens[start]] === undefined) continue;

    const phrase: string[] = [];
    for (let end = start; end < tokens.length; end += 1) {
      const token = tokens[end];
      if (
        NUMBER_WORDS[token] === undefined
        && NUMBER_SCALES[token] === undefined
        && token !== 'belas'
      ) break;
      phrase.push(token);
      const hasLargeScale = phrase.some((item) => (NUMBER_SCALES[item] ?? 0) >= 1_000);
      const before = tokens.slice(Math.max(0, start - 3), start).join(' ');
      if (hasLargeScale || /\b(?:nominal|sebesar|harga|uang|bayar)\b/.test(before)) {
        const value = parseWordNumber(phrase);
        if (value > 0) {
          candidates.push({
            value,
            text: phrase.join(' '),
            score: (hasLargeScale ? 8 : 3) + phrase.length / 100,
          });
        }
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score || a.text.length - b.text.length)[0];
}

function findAmount(text: string): AmountMatch | undefined {
  const digit = findDigitAmount(text);
  const word = findWordAmount(text);
  if (!digit) return word;
  if (!word) return digit;
  return digit.score >= word.score ? digit : word;
}

function formatLocalDate(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function createDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return undefined;
  return formatLocalDate(date);
}

function findDate(text: string, now: Date): string | undefined {
  if (/\b(?:hari ini|sekarang)\b/.test(text)) return formatLocalDate(now);
  if (/\bkemarin\b/.test(text)) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return formatLocalDate(date);
  }
  if (/\b(?:besok)\b/.test(text)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return formatLocalDate(date);
  }

  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return createDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : now.getFullYear();
    return createDate(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }

  const monthPattern = Object.keys(MONTHS).join('|');
  const named = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})(?:\\s+(20\\d{2}))?\\b`, 'i'));
  if (named) {
    return createDate(Number(named[3] ?? now.getFullYear()), MONTHS[named[2].toLocaleLowerCase('id-ID')], Number(named[1]));
  }

  const dayOnly = text.match(/\btanggal\s+(\d{1,2})\b/);
  if (dayOnly) return createDate(now.getFullYear(), now.getMonth(), Number(dayOnly[1]));
  return undefined;
}

function findType(text: string): TransactionType | undefined {
  const explicit = text.match(/\b(pemasukan|pengeluaran)\b/);
  if (explicit) return explicit[1] === 'pemasukan' ? 'income' : 'expense';
  const match = TYPE_KEYWORDS.find(({ words }) => words.some((word) => hasWord(text, word)));
  return match?.type;
}

function findCategory(text: string, type?: TransactionType): string | undefined {
  const categories = type === 'income'
    ? DEFAULT_INCOME_CATEGORIES
    : type === 'expense'
      ? DEFAULT_EXPENSE_CATEGORIES
      : [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES];

  for (const category of categories) {
    const keywords = CATEGORY_KEYWORDS[category] ?? [];
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return undefined;
}

function findSource(text: string): string | undefined {
  return SOURCE_KEYWORDS.find(({ pattern }) => pattern.test(text))?.source;
}

function sentenceCase(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.charAt(0).toLocaleUpperCase('id-ID') + trimmed.slice(1) : '';
}

function findNote(text: string, amount?: AmountMatch, source?: string, date?: string): string | undefined {
  const stopPattern = '(?=\\s+(?:pakai|dengan|menggunakan|via|lewat|tanggal|hari ini|kemarin|besok|pada)\\b|$)';
  const marked = text.match(new RegExp(`\\b(?:untuk|buat|mengenai|deskripsi(?:nya)?|catatan(?:nya)?)\\s+(.+?)${stopPattern}`, 'i'));
  if (marked?.[1]) return sentenceCase(marked[1]);

  let fallback = text;
  if (amount?.text) fallback = fallback.replace(amount.text, ' ');
  if (source) fallback = fallback.replace(new RegExp(`\\b(?:pakai|dengan|menggunakan|via|lewat)\\s+${source.replace(/\s/g, '\\s*')}\\b`, 'i'), ' ');
  if (date) fallback = fallback.replace(/\b(?:hari ini|sekarang|kemarin|besok|tanggal)\b.*$/i, ' ');
  fallback = fallback
    .replace(/\b(?:rp|pemasukan|pengeluaran|masuk|keluar|menerima|terima|dapat|bayar|beli|belanja|biaya|sebesar|nominal|uang|rupiah)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return fallback ? sentenceCase(fallback) : undefined;
}

export function parseTransactionVoiceTranscript(
  transcript: string,
  now = new Date(),
): ParsedTransactionVoice {
  const text = normalizeText(transcript);
  if (!text) return {};

  const type = findType(text);
  const amount = findAmount(text);
  const source = findSource(text);
  const date = findDate(text, now);

  return {
    type,
    amount: amount ? formatAmountInput(amount.value) : undefined,
    category: findCategory(text, type),
    note: findNote(text, amount, source, date),
    source,
    date,
  };
}

export function mergeParsedTransactionVoice(
  current: TransactionFormValues,
  parsed: ParsedTransactionVoice,
): TransactionFormValues {
  return {
    ...current,
    type: parsed.type ?? current.type,
    amount: parsed.amount ?? current.amount,
    category: parsed.category ?? current.category,
    source: parsed.source ?? current.source,
    date: parsed.date ?? current.date,
    note: parsed.note
      ? current.note?.trim()
        ? `${current.note.trim()}\n${parsed.note}`
        : parsed.note
      : current.note,
  };
}