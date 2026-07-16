"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/search-hit";
import { searchSitesSmart } from "@/lib/site-search";
import { ScoreChip } from "./ScoreChip";

export function CommandPalette({ sites }: { sites: SearchHit[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return sites.slice(0, 12);
    return searchSitesSmart(sites, query, 20).results;
  }, [q, sites]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/20 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="obesity · worst obesity · best sites in Texas…"
          className="h-12 w-full border-b border-[var(--line)] bg-transparent px-4 text-[14px] outline-none placeholder:text-[var(--muted)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              router.push(`/sites/${results[0].id}`);
              setOpen(false);
            }
          }}
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          <Link
            href="/#rank"
            className="flex items-center justify-between px-4 py-2 text-[13px] hover:bg-[var(--hover)]"
            onClick={() => setOpen(false)}
          >
            <span>Rank this protocol</span>
          </Link>
          <Link
            href={`/search`}
            className="flex items-center justify-between px-4 py-2 text-[13px] text-[var(--muted)] hover:bg-[var(--hover)]"
            onClick={() => setOpen(false)}
          >
            <span>Open full search{q ? ` for “${q}”` : ""}</span>
          </Link>
          {results.map((site) => (
            <button
              key={site.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-[var(--hover)]"
              onClick={() => {
                router.push(`/sites/${site.id}`);
                setOpen(false);
              }}
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{site.name}</div>
                <div className="truncate text-[11px] text-[var(--muted)]">
                  {site.type} · {site.hq}
                </div>
              </div>
              <ScoreChip value={site.scores.overallSiteQuality} compact />
            </button>
          ))}
          {results.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-[var(--muted)]">No matches.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
