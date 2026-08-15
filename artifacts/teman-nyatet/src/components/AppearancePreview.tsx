/**
 * Live mini-app preview shown at the top of Settings → Appearance.
 *
 * Every element uses the app's real design tokens, so the preview reacts to
 * every appearance choice as the actual UI would: accent (bg-primary), radius
 * (--radius via rounded-*), font (body stack), text scale (typography roles),
 * density (spacing utilities), and glass (--glass-blur/--glass-alpha on the
 * window chrome).
 */
export default function AppearancePreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 shadow-elevation-2" aria-hidden="true">
      {/* Window chrome — glass follows the Blur & Transparency setting */}
      <div
        className="flex items-center gap-1.5 border-b border-border/50 px-3.5 py-2.5"
        style={{
          backgroundColor: 'hsl(var(--background) / var(--glass-alpha))',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
        }}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-finance/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Preview
        </span>
      </div>

      <div className="space-y-3 bg-card p-3.5">
        {/* Fake note card — typography roles scale with Ukuran Teks */}
        <div className="rounded-2xl border border-border/60 bg-secondary/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p
              className="font-bold text-foreground"
              style={{ fontSize: 'calc(0.875rem * var(--text-scale))' }}
            >
              Catatan contoh
            </p>
            <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
              Hari ini
            </span>
          </div>
          <p
            className="mt-1 text-muted-foreground"
            style={{ fontSize: 'calc(0.6875rem * var(--text-scale))' }}
          >
            Teks, font, dan kerapatan di sini mengikuti pilihanmu secara langsung.
          </p>
        </div>

        {/* Progress indicator — accent + radius tokens */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-pill-label">Progres mingguan</span>
            <span className="text-pill-label">60%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full w-[60%] rounded-full bg-primary" />
          </div>
        </div>

        {/* Segmented mock — active state uses accent */}
        <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
          <span className="flex-1 rounded-lg bg-card py-1.5 text-center text-[10px] font-bold text-foreground shadow-sm">
            Aktif
          </span>
          <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-bold text-muted-foreground">
            Semua
          </span>
        </div>

        {/* Switch row — on state uses accent */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
          <span className="text-xs font-semibold text-foreground">Notifikasi</span>
          <span
            role="switch"
            aria-checked="true"
            className="flex h-6 w-11 items-center justify-end rounded-full bg-primary px-0.5"
          >
            <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
          </span>
        </div>

        {/* Input + primary button */}
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            Ketik sesuatu…
          </div>
          <button
            type="button"
            tabIndex={-1}
            className="rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-elevation-1 transition-transform active:scale-95"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
