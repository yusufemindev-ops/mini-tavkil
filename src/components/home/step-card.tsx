import { ArrowRight } from 'lucide-react';

// Prototype `.stepc` — numbered "how it works" card with an optional directional
// connector node that sits in the gap to the next card.
export function StepCard({
  number,
  title,
  body,
  connector = false,
}: {
  number: number;
  title: string;
  body: string;
  connector?: boolean;
}) {
  return (
    <div className="border-border bg-card hover:border-primary group relative z-[1] rounded-lg border p-[26px] transition-colors">
      <span className="bg-primary-soft text-primary group-hover:bg-primary grid size-[42px] place-items-center rounded-[11px] font-mono text-[1.05rem] font-semibold transition-colors group-hover:text-white">
        {number}
      </span>
      {connector && (
        <span className="border-border bg-background text-primary absolute end-[-16px] top-[34px] z-[3] hidden size-[26px] place-items-center rounded-full border p-1 [animation:connPulse_2s_var(--ease)_infinite] md:grid rtl:-scale-x-100">
          <ArrowRight className="size-full" strokeWidth={2.4} />
        </span>
      )}
      <h3 className="text-foreground mb-[9px] mt-4 text-lg font-bold">{title}</h3>
      <p className="text-foreground-soft text-[0.92rem] leading-relaxed">{body}</p>
    </div>
  );
}

// Prototype `.steps` — 3-up grid with a marching dashed connector line behind.
export function Steps({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid gap-[26px] md:grid-cols-3">
      <span
        aria-hidden
        className="absolute inset-x-[14%] top-[47px] z-0 hidden h-0.5 opacity-50 [animation:stepMarch_1.1s_linear_infinite] md:block rtl:[animation-direction:reverse]"
        style={{
          background:
            'repeating-linear-gradient(90deg, var(--primary) 0 7px, transparent 7px 15px)',
        }}
      />
      {children}
    </div>
  );
}
