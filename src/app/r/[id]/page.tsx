"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ScoreChip } from "@/components/ScoreChip";
import type { QualityScores } from "@/lib/types";

type StoredResult = {
  rank: number;
  match: number;
  accrualIndex: number;
  indFit: number;
  liftability: number;
  reasons: string[];
  confidence: string;
  siteId: string;
  siteName: string;
  siteHq: string;
  siteType: string;
  scores: QualityScores;
  enroll: number;
  ops: number;
  recruit: number;
};

type StoredRun = {
  id: string;
  createdAt: string;
  protocol: {
    name: string;
    disease: string;
    indication: string;
    geography: string[];
    enrollmentTarget: number;
    phase: string;
    restrictiveness: number;
    requireSpanish: boolean;
  };
  candidateCount: number;
  results: StoredResult[];
};

export default function RecommendationResultsPage() {
  const params = useParams<{ id: string }>();
  const [run, setRun] = useState<StoredRun | null>(null);
  const [selected, setSelected] = useState<StoredResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`atlas-run-${params.id}`);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredRun;
    setRun(parsed);
    setSelected(parsed.results[0] ?? null);
  }, [params.id]);

  if (!run) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="text-[16px] font-semibold">Run not found</h1>
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          Recommendation runs live in this browser session after Protocol Upload.
        </p>
        <Link href="/protocols/new" className="mt-4 inline-block underline">
          Upload a protocol
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-5">
      <div className="mb-4 border-b border-[var(--line)] pb-4">
          <div className="text-[11px] text-[var(--muted)]">Recommendation results</div>
        <h1 className="text-[18px] font-semibold tracking-tight">{run.protocol.name}</h1>
        <p className="text-[12px] text-[var(--muted)]">
          {run.protocol.disease} · Phase {run.protocol.phase} · N=
          {run.protocol.enrollmentTarget}
          {run.protocol.geography.length
            ? ` · ${run.protocol.geography.join(", ")}`
            : " · US"}
          {" · "}ρ={run.protocol.restrictiveness.toFixed(2)} · {run.candidateCount}{" "}
          sites ranked
        </p>
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Shortlist includes quality scores and Intera Lift. Accrual Index is relative
          (percentile) until proprietary enrollment data lands.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/#rank"
            className="inline-flex h-8 items-center rounded-md border border-[var(--line)] px-3 text-[12px] font-medium hover:bg-[var(--hover)]"
          >
            Rank another protocol
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-auto rounded border border-[var(--line)]">
          <table className="w-full min-w-[800px] text-left text-[12px]">
            <thead className="border-b border-[var(--line)] bg-[var(--panel)] text-[10px] uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-2 py-2 font-medium">#</th>
                <th className="px-2 py-2 font-medium">Site</th>
                <th className="px-2 py-2 font-medium">Match</th>
                <th className="px-2 py-2 font-medium">Accrual</th>
                <th className="px-2 py-2 font-medium">Overall</th>
                <th className="px-2 py-2 font-medium">Recruit</th>
                <th className="px-2 py-2 font-medium">Lift</th>
                <th className="px-2 py-2 font-medium">Ind</th>
              </tr>
            </thead>
            <tbody>
              {run.results.map((row) => (
                <tr
                  key={row.siteId}
                  className={`cursor-pointer border-b border-[var(--line)] hover:bg-[var(--hover)] ${
                    selected?.siteId === row.siteId ? "bg-[var(--hover)]" : ""
                  }`}
                  onClick={() => setSelected(row)}
                >
                  <td className="px-2 py-1.5 font-mono tabular">{row.rank}</td>
                  <td className="px-2 py-1.5">
                    <Link
                      href={`/sites/${row.siteId}`}
                      className="font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.siteName}
                    </Link>
                    <div className="text-[11px] text-[var(--muted)]">{row.siteHq}</div>
                  </td>
                  <td className="px-2 py-1.5 font-mono tabular">{row.match}</td>
                  <td className="px-2 py-1.5 font-mono tabular">{row.accrualIndex}</td>
                  <td className="px-2 py-1.5">
                    <ScoreChip value={row.scores.overallSiteQuality} compact />
                  </td>
                  <td className="px-2 py-1.5">
                    <ScoreChip value={row.scores.recruitmentStrength} compact />
                  </td>
                  <td className="px-2 py-1.5 font-mono tabular">{row.liftability.toFixed(2)}</td>
                  <td className="px-2 py-1.5 font-mono tabular">{row.indFit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="h-fit rounded border border-[var(--line)] bg-[var(--panel)] p-3">
          {selected ? (
            <>
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                Why selected
              </div>
              <h2 className="mt-1 text-[14px] font-semibold">{selected.siteName}</h2>
              <p className="text-[11px] text-[var(--muted)]">
                {selected.siteType} · confidence {selected.confidence}
              </p>
              <div className="mt-3 space-y-2">
                {selected.reasons.map((r) => (
                  <div key={r} className="text-[12px] leading-snug">
                    · {r}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <Metric label="Match" value={selected.match} />
                <Metric label="Accrual Idx" value={selected.accrualIndex} />
                <Metric label="Ind fit" value={selected.indFit} />
                <Metric label="Lift" value={selected.liftability} />
                <Metric label="Enroll feat" value={selected.enroll} />
                <Metric label="Ops feat" value={selected.ops} />
                <Metric label="Recruit feat" value={selected.recruit} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ScoreChip label="Overall" value={selected.scores.overallSiteQuality} compact />
                <ScoreChip label="Recruit" value={selected.scores.recruitmentStrength} compact />
                <ScoreChip label="Ops" value={selected.scores.operationalMaturity} compact />
              </div>
              <Link
                href={`/sites/${selected.siteId}`}
                className="mt-4 inline-block text-[12px] font-medium underline"
              >
                Open site profile
              </Link>
            </>
          ) : (
            <p className="text-[12px] text-[var(--muted)]">Select a row</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[var(--line)] px-2 py-1">
      <div className="text-[var(--muted)]">{label}</div>
      <div className="font-mono font-semibold tabular">
        {typeof value === "number" && value < 3 ? value.toFixed(2) : value}
      </div>
    </div>
  );
}
