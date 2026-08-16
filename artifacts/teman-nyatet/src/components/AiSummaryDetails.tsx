import { Sparkles } from 'lucide-react';
import { AI_SUMMARY_COPY } from '@/lib/ai-summary-copy';

type Props = {
  variant?: 'compact' | 'full';
  className?: string;
};

export default function AiSummaryDetails({ variant = 'compact', className = '' }: Props) {
  if (variant === 'compact') {
    return (
      <div className={`rounded-2xl border border-primary/15 bg-primary/[0.045] px-4 py-3 ${className}`}>
        <div className="flex items-start gap-2.5">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-black text-foreground">{AI_SUMMARY_COPY.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {AI_SUMMARY_COPY.sharedDescription} {AI_SUMMARY_COPY.creditDescription}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`rounded-[1.5rem] border border-primary/15 bg-primary/[0.045] p-5 shadow-elevation-1 sm:p-6 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">AI Credit</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">{AI_SUMMARY_COPY.title}</h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{AI_SUMMARY_COPY.sharedDescription}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
          <p className="text-sm font-black text-foreground">{AI_SUMMARY_COPY.notes.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{AI_SUMMARY_COPY.notes.description}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
          <p className="text-sm font-black text-foreground">{AI_SUMMARY_COPY.financial.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{AI_SUMMARY_COPY.financial.description}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Periode:</strong> {AI_SUMMARY_COPY.financial.periods}.</li>
        <li><strong className="text-foreground">Isi ringkasan:</strong> {AI_SUMMARY_COPY.financial.details}</li>
        <li><strong className="text-foreground">Biaya:</strong> {AI_SUMMARY_COPY.creditDescription}</li>
        <li><strong className="text-foreground">Privasi:</strong> {AI_SUMMARY_COPY.financial.privacy}</li>
      </ul>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{AI_SUMMARY_COPY.disclaimer}</p>
    </section>
  );
}