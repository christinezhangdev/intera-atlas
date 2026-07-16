import Link from "next/link";

/** Static product preview — shows Atlas as routing, not only ranking. */
export function HeroConnectionPreview() {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white shadow-[0_1px_0_rgba(17,24,39,0.04)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Recommended connection
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">Protocol → site routing</p>
        </div>
        <span className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
          Fit 91
        </span>
      </div>

      <div className="space-y-3 px-4 py-4 text-[12px]">
        <Row label="Protocol" value="Phase 3 obesity study" />
        <Row label="Sponsor" value="Unclaimed sponsor profile" muted />
        <div className="flex items-start justify-between gap-3 border-t border-[var(--line)] pt-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Site</div>
            <div className="mt-0.5 font-semibold text-[var(--ink)]">Velocity Clinical Research</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>Verified · domain</Badge>
              <Badge>Observed history</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Match evidence
          </div>
          <p className="mt-1.5 leading-relaxed text-[var(--ink)]">
            Prior metabolic studies · active capacity signal · relevant patient access
          </p>
        </div>

        <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
            Risk to confirm
          </div>
          <p className="mt-1.5 leading-relaxed text-amber-950/80">
            Competing study load not fully visible
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-4 py-3">
        <Link
          href="/sites/velocity-clinical-research-20"
          className="inline-flex h-8 items-center rounded-md border border-[var(--line)] px-3 text-[11px] font-medium hover:bg-[var(--hover)]"
        >
          View profile
        </Link>
        <Link
          href="/join"
          className="inline-flex h-8 items-center rounded-md bg-[var(--accent)] px-3 text-[11px] font-medium text-white hover:opacity-90"
        >
          Request intro
        </Link>
        <span className="ml-auto self-center text-[10px] text-[var(--muted)]">Demo preview</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <span className={`text-right font-medium ${muted ? "text-[var(--muted)]" : "text-[var(--ink)]"}`}>
        {value}
      </span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-sm border border-[var(--line)] bg-white px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
      {children}
    </span>
  );
}
