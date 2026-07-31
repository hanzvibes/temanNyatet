# AI Summary Feature Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menampilkan detail Ringkasan AI yang konsisten di semua section aplikasi.

**Architecture:** Sumber copy berada di `src/lib/ai-summary-copy.ts`, sedangkan
`AiSummaryDetails` menyediakan tampilan compact/full. Halaman produk dan
dokumen legal menggunakan sumber copy tersebut tanpa mengubah perilaku billing.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner melalui `tsx`.

## Global Constraints

- Satu credit berlaku untuk satu ringkasan yang berhasil dibuat.
- Ringkasan transaksi hanya untuk Minggu Ini, Bulan Ini, dan Custom Range.
- Data transaksi mentah dan catatan transaksi tidak dikirim ke provider AI.
- Ringkasan bukan nasihat keuangan.
- Tidak mengubah endpoint, harga, saldo, RPC, atau alur pembayaran.

### Task 1: Shared copy contract

**Files:**
- Create: `artifacts/teman-nyatet/src/lib/ai-summary-copy.ts`
- Test: `artifacts/teman-nyatet/src/lib/ai-summary-copy.test.ts`

- [ ] Write a failing test asserting required feature details exist in the shared copy.
- [ ] Run the focused test and verify it fails because the module does not exist.
- [ ] Add typed copy constants for shared labels, feature bullets, privacy text, and terms text.
- [ ] Run the focused test and verify it passes.

### Task 2: Shared details component

**Files:**
- Create: `artifacts/teman-nyatet/src/components/AiSummaryDetails.tsx`

- [ ] Create compact and full visual variants using the shared copy.
- [ ] Keep the component informational only; it must not trigger credit consumption or payment.
- [ ] Run frontend typecheck.

### Task 3: Product screens

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/SubscriptionPage.tsx`
- Modify: `artifacts/teman-nyatet/src/components/TopUpSection.tsx`
- Modify: `artifacts/teman-nyatet/src/components/SettingsSheet.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/CatatanPage.tsx`
- Modify: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`

- [ ] Add full feature details to Subscription.
- [ ] Explain both note and financial summaries in Top Up and Settings.
- [ ] Add the shared compact explanation to Catatan and Keuangan without duplicating contradictory copy.
- [ ] Run frontend typecheck and build.

### Task 4: Legal screens and verification

**Files:**
- Modify: `artifacts/teman-nyatet/src/pages/LegalPage.tsx`

- [ ] Add privacy language for aggregate-only financial AI processing.
- [ ] Add terms language clarifying credit usage and no financial advice.
- [ ] Run focused test, frontend typecheck/build, `git diff --check`, restart artifact workflows, and inspect preview/browser logs.