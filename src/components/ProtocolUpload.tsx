"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProtocolDraft, Site } from "@/lib/types";
import { parseProtocolText, rankSitesForProtocol } from "@/lib/ranking";

export const SAMPLE_PROTOCOL = `Phase 3 cardiometabolic protocol
Indication: Obesity / Type 2 diabetes
Geography: United States, prefer Texas, Florida, North Carolina
Enrollment: 600 patients
Inclusion criteria: Adults 18-75 with BMI >= 30 or T2D with HbA1c 7-10%. Stable therapy 3 months.
Exclusion criteria: Recent GLP-1 use within washout; severe renal impairment; prior bariatric surgery <1 year.
Visit burden: Monthly clinic visits for 68 weeks
Biomarkers: HbA1c, fasting glucose
Spanish-speaking access preferred
`;

export function ProtocolUpload({
  sites,
  variant = "page",
}: {
  sites: Site[];
  variant?: "page" | "wedge";
}) {
  const router = useRouter();
  const [raw, setRaw] = useState(SAMPLE_PROTOCOL);
  const [parsed, setParsed] = useState(() => parseProtocolText(SAMPLE_PROTOCOL));
  const [geoText, setGeoText] = useState("Texas, Florida, North Carolina");
  const [running, setRunning] = useState(false);

  const draft: ProtocolDraft = useMemo(
    () => ({
      ...parsed,
      id: "draft",
      geography: geoText
        .split(/,/)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
    [parsed, geoText],
  );

  function reparse(text: string) {
    setRaw(text);
    const p = parseProtocolText(text);
    setParsed(p);
    if (p.geography.length) setGeoText(p.geography.join(", "));
  }

  function run() {
    setRunning(true);
    const protocol: ProtocolDraft = {
      ...draft,
      id: `p-${Date.now()}`,
    };
    const results = rankSitesForProtocol(sites, protocol).slice(0, 40);
    const runId = `r-${Date.now()}`;
    const payload = {
      id: runId,
      createdAt: new Date().toISOString(),
      protocol,
      candidateCount: results.length,
      results: results.map((r) => ({
        ...r,
        siteId: r.site.id,
        siteName: r.site.name,
        siteHq: r.site.hq,
        siteType: r.site.type,
        scores: r.site.scores,
      })),
    };
    sessionStorage.setItem(`atlas-run-${runId}`, JSON.stringify(payload));
    router.push(`/r/${runId}`);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, sites]);

  if (variant === "wedge") {
    return (
      <div id="rank" className="scroll-mt-16">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                Paste a protocol
              </h2>
              <p className="text-[12px] text-[var(--muted)]">
                We extract indication, geography, and eligibility — then match the verified org graph.
              </p>
            </div>
            <button
              type="button"
              onClick={() => reparse(SAMPLE_PROTOCOL)}
              className="text-[12px] text-[var(--muted)] underline hover:text-[var(--ink)]"
            >
              Use sample protocol
            </button>
          </div>

          <textarea
            value={raw}
            onChange={(e) => reparse(e.target.value)}
            className="h-44 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 font-mono text-[12px] leading-relaxed outline-none focus:border-[var(--accent)]"
            placeholder="Paste protocol synopsis, eligibility, geography…"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field
              label="Indication"
              value={parsed.indication}
              onChange={(v) => setParsed((p) => ({ ...p, indication: v, disease: v }))}
            />
            <Field
              label="Geography"
              value={geoText}
              onChange={setGeoText}
              hint="States"
            />
            <Field
              label="Enrollment target"
              value={String(parsed.enrollmentTarget)}
              onChange={(v) =>
                setParsed((p) => ({ ...p, enrollmentTarget: Number(v) || 0 }))
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <div className="flex flex-wrap gap-4 text-[12px] text-[var(--muted)]">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={parsed.requireSpanish}
                  onChange={(e) =>
                    setParsed((p) => ({ ...p, requireSpanish: e.target.checked }))
                  }
                />
                Spanish preferred
              </label>
              <span>
                Restrictiveness ρ{" "}
                <span className="font-mono text-[var(--ink)]">
                  {parsed.restrictiveness.toFixed(2)}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={run}
              disabled={running || !raw.trim()}
              className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {running ? "Ranking…" : "Rank this protocol"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-[18px] font-semibold tracking-tight">Protocol Upload</h1>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        Paste protocol text → ranked shortlist with quality scores and Intera Lift.
      </p>
      <div className="mt-5">
        <ProtocolUpload sites={sites} variant="wedge" />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-[11px] text-[var(--muted)]">
        <span>{label}</span>
        {hint ? <span>{hint}</span> : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 text-[13px] outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}
