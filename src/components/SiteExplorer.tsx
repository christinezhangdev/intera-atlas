"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ScoreChip } from "@/components/ScoreChip";
import { formatNumber } from "@/lib/format";
import type { Site } from "@/lib/types";

export function SiteExplorer({ sites }: { sites: Site[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [minOverall, setMinOverall] = useState(0);
  const [spanishOnly, setSpanishOnly] = useState(false);
  const [sort, setSort] = useState<"overall" | "trials" | "recruit" | "icp" | "name">("overall");

  const types = useMemo(() => {
    const c = new Map<string, number>();
    for (const s of sites) c.set(s.type, (c.get(s.type) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [sites]);

  const filtered = useMemo(() => {
    let rows = sites;
    if (type !== "all") rows = rows.filter((s) => s.type === type);
    if (spanishOnly) rows = rows.filter((s) => s.spanish);
    if (minOverall > 0) {
      rows = rows.filter((s) => (s.scores.overallSiteQuality ?? -1) >= minOverall);
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((s) =>
        `${s.name} ${s.hq} ${s.states} ${s.therapeuticAreas} ${s.sponsorsWorkedWith}`
          .toLowerCase()
          .includes(needle),
      );
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case "trials":
          return b.histTrials - a.histTrials;
        case "recruit":
          return (b.scores.recruitmentStrength ?? -1) - (a.scores.recruitmentStrength ?? -1);
        case "icp":
          return b.icpScore - a.icpScore;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return (b.scores.overallSiteQuality ?? -1) - (a.scores.overallSiteQuality ?? -1);
      }
    });
    return sorted;
  }, [sites, q, type, minOverall, spanishOnly, sort]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Site Explorer</h1>
          <p className="text-[12px] text-[var(--muted)]">
            {filtered.length} of {sites.length} nodes · filters compose like Linear
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter name, state, TA, sponsor…"
            className="h-8 w-64 rounded border border-[var(--line)] bg-[var(--panel)] px-2.5 text-[12px] outline-none focus:border-[var(--ink)]"
          />
          <Link
            href="/join/new-site"
            className="inline-flex h-8 items-center rounded-md border border-[var(--line)] px-3 text-[12px] font-medium hover:bg-[var(--hover)]"
          >
            Don&apos;t see your site?
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--accent-soft)]/40 px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold">Don&apos;t see your site on here?</div>
          <p className="text-[12px] text-[var(--muted)]">
            Create an Atlas profile with your company email + website. You&apos;ll show up as unscored
            until Intera ingests public signals — private fields still power matching.
          </p>
        </div>
        <Link
          href="/join/new-site"
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-[var(--accent)] px-3 text-[12px] font-medium text-white hover:opacity-90"
        >
          Create a profile
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-7 rounded border border-[var(--line)] bg-[var(--panel)] px-2"
        >
          <option value="all">All types</option>
          {types.map(([t, n]) => (
            <option key={t} value={t}>
              {t} ({n})
            </option>
          ))}
        </select>
        <select
          value={minOverall}
          onChange={(e) => setMinOverall(Number(e.target.value))}
          className="h-7 rounded border border-[var(--line)] bg-[var(--panel)] px-2"
        >
          <option value={0}>Overall ≥ 0</option>
          <option value={40}>Overall ≥ 40</option>
          <option value={60}>Overall ≥ 60</option>
          <option value={80}>Overall ≥ 80</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-7 rounded border border-[var(--line)] bg-[var(--panel)] px-2"
        >
          <option value="overall">Sort: Overall</option>
          <option value="recruit">Sort: Recruit</option>
          <option value="trials">Sort: Trials</option>
          <option value="icp">Sort: ICP</option>
          <option value="name">Sort: Name</option>
        </select>
        <label className="flex h-7 items-center gap-1.5 rounded border border-[var(--line)] px-2">
          <input
            type="checkbox"
            checked={spanishOnly}
            onChange={(e) => setSpanishOnly(e.target.checked)}
          />
          Spanish
        </label>
      </div>

      <div className="overflow-auto rounded border border-[var(--line)]">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="sticky top-0 border-b border-[var(--line)] bg-[var(--panel)] text-[10px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Site</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Overall</th>
              <th className="px-2 py-2 font-medium">Recruit</th>
              <th className="px-2 py-2 font-medium">Ops</th>
              <th className="px-2 py-2 font-medium">Sponsor</th>
              <th className="px-2 py-2 font-medium">Ther</th>
              <th className="px-2 py-2 font-medium">Trials</th>
              <th className="px-2 py-2 font-medium">Active</th>
              <th className="px-2 py-2 font-medium">ICP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 250).map((site) => (
              <tr key={site.id} className="border-b border-[var(--line)] hover:bg-[var(--hover)]">
                <td className="px-3 py-1.5">
                  <Link href={`/sites/${site.id}`} className="font-medium hover:underline">
                    {site.name}
                  </Link>
                  <div className="text-[11px] text-[var(--muted)]">{site.hq}</div>
                </td>
                <td className="px-2 py-1.5 text-[var(--muted)]">{site.type}</td>
                <td className="px-2 py-1.5">
                  <ScoreChip value={site.scores.overallSiteQuality} compact />
                </td>
                <td className="px-2 py-1.5">
                  <ScoreChip value={site.scores.recruitmentStrength} compact />
                </td>
                <td className="px-2 py-1.5">
                  <ScoreChip value={site.scores.operationalMaturity} compact />
                </td>
                <td className="px-2 py-1.5">
                  <ScoreChip value={site.scores.sponsorAttractiveness} compact />
                </td>
                <td className="px-2 py-1.5">
                  <ScoreChip value={site.scores.therapeuticExpertise} compact />
                </td>
                <td className="px-2 py-1.5 font-mono tabular">{formatNumber(site.histTrials)}</td>
                <td className="px-2 py-1.5 font-mono tabular">{formatNumber(site.activeNow)}</td>
                <td className="px-2 py-1.5 font-mono tabular">{site.icpScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 250 ? (
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          Showing first 250 — refine filters to narrow.
        </p>
      ) : null}
    </div>
  );
}
