// Single source of truth for the lucide icons paired with every note tag
// and transaction category option. Adding a new tag or category here
// automatically carries an icon to all picker UIs.
//
// Why this module exists:
//   - CatatanPage has two tag-picker locations (read-mode modal edit and
//     create-form drawer) and they're rendered from the same string list.
//   - SheetFormContent has both a note tag picker AND a transaction
//     category picker, each built from its own string array.
//   - Without a shared module, each spot had to know which lucide export
//     to render — easy to drift (one spot uses Briefcase, another uses
//     BriefcaseBusiness). One map, three consumers.
import {
  Briefcase,
  User,
  Lightbulb,
  BookOpen,
  Tag as TagIcon,
  // Income
  Wallet as WalletIcon,
  Globe,
  Building2,
  TrendingUp,
  Gift as GiftIcon,
  // Expense
  Utensils,
  Bus,
  ShoppingBag,
  ReceiptText,
  HeartPulse,
  Film,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NoteTagOption = { name: string; icon: LucideIcon };

// Note tags — used by CatatanPage (modal edit + create drawer) and the
// bottom-sheet NoteSheetForm in SheetFormContent.
export const NOTE_TAGS: readonly NoteTagOption[] = [
  { name: 'Kerja', icon: Briefcase },
  { name: 'Personal', icon: User },
  { name: 'Ide', icon: Lightbulb },
  { name: 'Belajar', icon: BookOpen },
  { name: 'Lainnya', icon: TagIcon },
];

// Transaction categories — both income and expense merged into one map
// so the picker can do a single lookup `CATEGORY_ICON[cat]` without
// branching on tx type. Unknown categories fall through to `MoreHorizontal`
// (the "anything else" affordance).
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  // Income
  Gaji: WalletIcon,
  Freelance: Globe,
  Bisnis: Building2,
  Investasi: TrendingUp,
  Hadiah: GiftIcon,
  // Expense
  Makanan: Utensils,
  Transport: Bus,
  Belanja: ShoppingBag,
  Tagihan: ReceiptText,
  Kesehatan: HeartPulse,
  Hiburan: Film,
  Pendidikan: GraduationCap,
};

export const FALLBACK_CATEGORY_ICON: LucideIcon = MoreHorizontal;

// Helpers — consumers don't need to know about LucideIcon typing or
// fallback rules; just call these.
export function iconForNoteTag(name: string): LucideIcon {
  return NOTE_TAGS.find((t) => t.name === name)?.icon ?? TagIcon;
}
export function iconForCategory(name: string): LucideIcon {
  return CATEGORY_ICON[name] ?? FALLBACK_CATEGORY_ICON;
}
