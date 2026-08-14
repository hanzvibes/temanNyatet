import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import type { Note } from '@/lib/database.types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value == null ? fallback : String(value);
}

function asTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string');
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((tag): tag is string => typeof tag === 'string')
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asPosition(value: unknown): number | null {
  const position = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(position) ? position : null;
}

function asColor(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asDate(value: unknown): string {
  const date = asText(value);
  return date && Number.isFinite(Date.parse(date)) ? date : '';
}

/**
 * Normalize the untrusted row shape returned by the API before it reaches
 * the render tree. Rows can contain empty cells, JSON strings, invalid
 * dates, or duplicate IDs.
 */
export function normalizeNotes(input: unknown): Note[] {
  if (!Array.isArray(input)) return [];

  const seenIds = new Set<string>();
  const notes: Note[] = [];

  for (const value of input) {
    if (!isRecord(value)) continue;

    const id = asText(value.id).trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    notes.push({
      id,
      user_id: asText(value.user_id),
      title: value.title == null ? null : asText(value.title),
      content: asText(value.content),
      tags: asTags(value.tags),
      created_at: asDate(value.created_at),
      updated_at: asDate(value.updated_at),
      position: asPosition(value.position),
      color: asColor(value.color),
    });
  }

  return notes;
}

export function noteTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function formatNoteDate(
  value: string,
  pattern: string,
  locale: Locale,
): string {
  const timestamp = noteTimestamp(value);
  return timestamp === 0
    ? 'Tanggal tidak tersedia'
    : format(new Date(timestamp), pattern, { locale });
}