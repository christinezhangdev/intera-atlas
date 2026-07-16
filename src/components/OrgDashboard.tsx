"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScoreChip } from "@/components/ScoreChip";

type SponsorRow = {
  rank: number;
  score: number;
  rationale: string[];
  sponsor: { id: string; name: string; domain: string | null; siteCount: number; therapeuticHints: string };
};

type SiteRow = {
  rank: number;
  matchScore: number;
  headline: string;
  site: { id: string; name: string; hq: string };
  scores: { overallSiteQuality: number | null };
};

export function OrgDashboard() {
  const params = useSearchParams();
  const [claimId, setClaimId] = useState(params.get("claimId") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    claim?: { orgName: string; role: string; domain: string; status: string; workEmail: string };
    kind?: string;
    sponsors?: SponsorRow[];
    matches?: SiteRow[];
  } | null>(null);

  useEffect(() => {
    const id =
      params.get("claimId") ||
      (typeof window !== "undefined" ? localStorage.getItem("atlas-claim-id") : null) ||
      "";
    if (id) setClaimId(id);
  }, [params]);

  useEffect(() => {
    if (!claimId) return;
    setLoading(true);
    setError("");
    fetch(`/api/org-matches?claimId=${encodeURIComponent(claimId)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [claimId]);

  if (!claimId) {
    return (
      <div className="rounded-xl border border-[var(--line)] p-6 text-center">
        <p className="text-[14px]">No organization workspace yet.</p>
        <Link href="/join" className="mt-3 inline-block text-[13px] font-medium text-[var(--accent)] underline">
          Are you a site or sponsor? Join Atlas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data?.claim ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                {data.claim.role} workspace · {data.claim.status}
              </div>
              <h1 className="text-[18px] font-semibold">{data.claim.orgName}</h1>
              <p className="text-[12px] text-[var(--muted)]">
                {data.claim.workEmail} · @{data.claim.domain}
              </p>
            </div>
            <Link href="/join" className="text-[12px] text-[var(--muted)] underline">
              Claim another org
            </Link>
          </div>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            Your uploaded private fields are factored into recommendations below. Observed quality
            scores still come from Intera — you enrich, you don&apos;t overwrite.
          </p>
        </div>
      ) : null}

      {loading ? <p className="text-[12px] text-[var(--accent)]">Matching…</p> : null}
      {error ? <p className="text-[12px] text-amber-700">{error}</p> : null}

      {data?.kind === "sponsors-for-site" && data.sponsors ? (
        <div>
          <h2 className="text-[15px] font-semibold">Best-fit sponsors for your site</h2>
          <p className="text-[12px] text-[var(--muted)]">
            Ranked from Atlas network relationships + what you said you&apos;re seeking.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[var(--line)] bg-[var(--hover)] text-[10px] uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-2 py-2">Sponsor</th>
                  <th className="px-2 py-2">Score</th>
                  <th className="px-2 py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {data.sponsors.map((row) => (
                  <tr key={row.sponsor.id} className="border-b border-[var(--line)]">
                    <td className="px-3 py-2 font-mono">{row.rank}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{row.sponsor.name}</div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {row.sponsor.domain ? `@${row.sponsor.domain}` : "unclaimed stub"} ·{" "}
                        {row.sponsor.siteCount} graph sites
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono">{row.score}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      {row.rationale.slice(0, 2).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {data?.kind === "sites-for-sponsor" && data.matches ? (
        <div>
          <h2 className="text-[15px] font-semibold">Best-fit sites for your pipeline</h2>
          <p className="text-[12px] text-[var(--muted)]">
            Observed ranking + your uploaded therapeutic focus, geography, and site preferences.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[var(--line)] bg-[var(--hover)] text-[10px] uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-2 py-2">Site</th>
                  <th className="px-2 py-2">Match</th>
                  <th className="px-2 py-2">Overall</th>
                  <th className="px-2 py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {data.matches.map((row) => (
                  <tr key={row.site.id} className="border-b border-[var(--line)]">
                    <td className="px-3 py-2 font-mono">{row.rank}</td>
                    <td className="px-2 py-2">
                      <Link href={`/sites/${row.site.id}`} className="font-medium underline">
                        {row.site.name}
                      </Link>
                      <div className="text-[11px] text-[var(--muted)]">{row.site.hq}</div>
                    </td>
                    <td className="px-2 py-2 font-mono">{row.matchScore}</td>
                    <td className="px-2 py-2">
                      <ScoreChip value={row.scores.overallSiteQuality} compact />
                    </td>
                    <td className="max-w-[240px] truncate px-2 py-2 text-[var(--muted)]">
                      {row.headline}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px]">
            Or{" "}
            <Link href="/#rank" className="font-medium text-[var(--accent)] underline">
              upload a full protocol
            </Link>{" "}
            for deeper eligibility parsing.
          </p>
        </div>
      ) : null}
    </div>
  );
}
