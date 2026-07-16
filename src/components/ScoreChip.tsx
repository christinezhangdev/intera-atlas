import { scoreColor } from "@/lib/format";
import type { QualityScores } from "@/lib/types";

export function ScoreChip({
  label,
  value,
  compact,
}: {
  label?: string;
  value: number | null | undefined;
  compact?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label ? (
        <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {label}
        </span>
      ) : null}
      <span
        className={`inline-flex min-w-[28px] items-center justify-center rounded px-1.5 font-mono text-[11px] font-semibold tabular-nums ${scoreColor(value)} ${
          compact ? "h-5" : "h-6"
        }`}
      >
        {value == null ? "—" : value}
      </span>
    </span>
  );
}

export function QualityRow({ scores }: { scores: QualityScores }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <ScoreChip label="Overall" value={scores.overallSiteQuality} />
      <ScoreChip label="Recruit" value={scores.recruitmentStrength} />
      <ScoreChip label="Ops" value={scores.operationalMaturity} />
      <ScoreChip label="Sponsor" value={scores.sponsorAttractiveness} />
      <ScoreChip label="Ther" value={scores.therapeuticExpertise} />
    </div>
  );
}
