"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ScoreChip } from "@/components/ScoreChip";
import { formatNumber } from "@/lib/format";
import { searchSitesSmart } from "@/lib/site-search";
import type { QualityScores } from "@/lib/types";

type Slim = {
  id: string;
  name: string;
  hq: string;
  type: string;
  states: string;
  therapeuticAreas: string;
  sponsorsWorkedWith: string;
  scores: QualityScores;
  histTrials: number;
  activeNow: number;
  icpScore: number;
  spanish: boolean;
  therapeuticSpecialties?: string;
  notes?: string;
};

export function SearchPageClient({ sites }: { sites: Slim[] }) {
  const [q, setQ] = useState("obesity");

  const { results, parsed, relevantCount } = useMemo(
    () => searchSitesSmart(sites, q, 40),
    [q, sites],
  );

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-[18px] font-semibold tracking-tight">Search</h1>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        Try: obesity · worst obesity sites · best obesity sites in Texas · sites that work with
        Lilly.{" "}
        <a href="/join/new-site" className="text-[var(--accent)] underline">
          Don&apos;t see your site?
        </a>
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-4 h-10 w-full rounded border border-[var(--line)] bg-[var(--panel)] px-3 text-[14px] outline-none focus:border-[var(--ink)]"
        placeholder="Sites, sponsors, TAs, cities, NL…"
        autoFocus
      />
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        {relevantCount} relevant · showing {results.length} · sorted by{" "}
        {parsed.order === "worst" ? "lowest quality first" : "highest quality first"}
        {parsed.needles.length ? ` · match: ${parsed.needles.slice(0, 6).join(", ")}` : ""}
      </p>

      <div className="mt-4 overflow-hidden rounded border border-[var(--line)]">
        <table className="w-full text-left text-[12px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel)] text-[10px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Site</th>
              <th className="px-2 py-2 font-medium">Overall</th>
              <th className="px-2 py-2 font-medium">Recruit</th>
              <th className="px-2 py-2 font-medium">Trials</th>
              <th className="px-2 py-2 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {results.map((site) => (
              <tr key={site.id} className="border-b border-[var(--line)] hover:bg-[var(--hover)]">
                <td className="px-3 py-2">
                  <Link href={`/sites/${site.id}`} className="font-medium hover:underline">
                    {site.name}
                  </Link>
                  <div className="text-[11px] text-[var(--muted)]">
                    {site.type} · {site.hq}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <ScoreChip value={site.scores.overallSiteQuality} compact />
                </td>
                <td className="px-2 py-2">
                  <ScoreChip value={site.scores.recruitmentStrength} compact />
                </td>
                <td className="px-2 py-2 font-mono tabular">{formatNumber(site.histTrials)}</td>
                <td className="px-2 py-2 font-mono tabular">{formatNumber(site.activeNow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 ? (
          <div className="px-3 py-8 text-[13px] text-[var(--muted)]">No matches.</div>
        ) : null}
      </div>
    </div>
  );
}
