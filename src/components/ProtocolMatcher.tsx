"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ScoreChip } from "@/components/ScoreChip";
import {
  matchTrialSites,
  type MatchResult,
  type RationalePoint,
  type TrialSiteMatch,
} from "@/lib/match-engine";
import { parseProtocol, type ParsedProtocol } from "@/lib/protocol-parser";
import type { Site } from "@/lib/types";

const SAMPLE = `Phase 3 cardiometabolic protocol
Indication: Obesity / Type 2 diabetes
Geography: United States, prefer Texas, Florida, North Carolina
Enrollment: 600 patients
Inclusion criteria: Adults 18-75 with BMI >= 30 or T2D with HbA1c 7-10%. Stable therapy 3 months.
Exclusion criteria: Recent GLP-1 use within washout; severe renal impairment; prior bariatric surgery <1 year.
Visit burden: Monthly clinic visits for 68 weeks
Biomarkers: HbA1c, fasting glucose
Spanish-speaking access preferred
`;

type Step = "input" | "parsed" | "matches";

export function ProtocolMatcher({ sites }: { sites: Site[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [parsed, setParsed] = useState<ParsedProtocol | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [selected, setSelected] = useState<TrialSiteMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [engineMeta, setEngineMeta] = useState("");
  const [error, setError] = useState("");

  const confColor = useMemo(
    () => ({
      high: "text-emerald-700",
      medium: "text-amber-700",
      low: "text-gray-500",
    }),
    [],
  );

  async function onFile(file: File) {
    setError("");
    setFilename(file.name);
    setStatus(`Reading ${file.name}…`);
    setBusy(true);
    try {
      if (
        file.type.startsWith("text/") ||
        /\.(txt|md|csv)$/i.test(file.name)
      ) {
        const text = await file.text();
        setRaw(text);
        setStatus("File loaded — ready to analyze");
      } else {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload-protocol", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setRaw(data.text || "");
        const nextParsed = data.parsed as ParsedProtocol;
        setParsed(nextParsed);
        setEngineMeta(
          data.engine === "llm"
            ? `Extracted with ${data.model}`
            : "Extracted with local heuristics",
        );
        setStatus("Extracted — generating shortlist + match evidence…");
        setStep("parsed");
        await runMatchFromParsed(nextParsed, data.engine, data.model);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function runMatchFromParsed(
    nextParsed: ParsedProtocol,
    parseEngine?: string,
    parseModel?: string | null,
  ) {
    setBusy(true);
    setError("");
    setStatus("Generating shortlist + match evidence…");
    try {
      const matchRes = await fetch("/api/match-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed: nextParsed, limit: 30, withAiRationale: true }),
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error || "Match failed");

      const m = matchData as MatchResult & { engine?: string; embeddingModel?: string | null };
      setResult(m);
      setSelected(m.matches[0] ?? null);
      setEngineMeta(
        [
          parseEngine === "llm" && parseModel ? `parse:${parseModel}` : parseEngine,
          m.engine,
          m.embeddingModel ? `emb:${m.embeddingModel}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      setStep("matches");
      setStatus("");
    } catch (e) {
      try {
        const m = matchTrialSites(sites, nextParsed, 30);
        setResult(m);
        setSelected(m.matches[0] ?? null);
        setStep("matches");
        setEngineMeta("local fallback");
        setError(e instanceof Error ? `${e.message} — used local fallback` : "Used local fallback");
      } catch {
        setError(e instanceof Error ? e.message : "Match failed");
        setStep("parsed");
      }
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function runPipeline(textOverride?: string) {
    const text = (textOverride ?? raw).trim();
    if (!text) {
      setError("Upload a protocol file or paste text first.");
      return;
    }
    setBusy(true);
    setError("");
    setRaw(text);

    try {
      setStatus("Parsing protocol with AI…");
      let nextParsed = parsed;
      if (!nextParsed || textOverride || text !== parsed?.rawText) {
        const res = await fetch("/api/parse-protocol", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Parse failed");
        nextParsed = data.parsed as ParsedProtocol;
        setParsed(nextParsed);
        setEngineMeta(
          data.engine === "llm"
            ? `Extracted with ${data.model}`
            : "Extracted with local heuristics",
        );
      }
      setStep("parsed");
      setBusy(false);
      await runMatchFromParsed(nextParsed!);
    } catch (e) {
      // Local fallback path
      try {
        const p = parsed || parseProtocol(text);
        setParsed(p);
        const m = matchTrialSites(sites, p, 30);
        setResult(m);
        setSelected(m.matches[0] ?? null);
        setStep("matches");
        setEngineMeta("local fallback");
        setError(e instanceof Error ? `${e.message} — used local fallback` : "Used local fallback");
      } catch {
        setError(e instanceof Error ? e.message : "Analyze failed");
      }
      setStatus("");
      setBusy(false);
    }
  }

  return (
    <div id="rank" className="scroll-mt-16 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        {(
          [
            ["input", "1. Upload / paste"],
            ["parsed", "2. Requirements"],
            ["matches", "3. Shortlist + evidence"],
          ] as const
        ).map(([id, label]) => (
          <span
            key={id}
            className={`rounded-full px-2.5 py-1 ${
              step === id
                ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                : "text-[var(--muted)]"
            }`}
          >
            {label}
          </span>
        ))}
        {engineMeta ? (
          <span className="ml-auto text-[11px] text-[var(--muted)]">{engineMeta}</span>
        ) : null}
      </div>
      {status ? <p className="text-[12px] text-[var(--accent)]">{status}</p> : null}
      {error ? <p className="text-[12px] text-amber-700">{error}</p> : null}

      {step === "input" ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Run a protocol match</h2>
              <p className="text-[12px] text-[var(--muted)]">
                Upload a protocol, synopsis, or eligibility criteria. Atlas returns a ranked site
                shortlist with fit scores, match evidence, confidence flags, and recommended next
                steps.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRaw(SAMPLE);
                setFilename(null);
              }}
              className="text-[12px] text-[var(--muted)] underline hover:text-[var(--ink)]"
            >
              Use sample text
            </button>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] px-4 py-8 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/30">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <span className="text-[13px] font-medium">
              {filename ? filename : "Drop a protocol file or click to browse"}
            </span>
            <span className="mt-1 text-[11px] text-[var(--muted)]">Max 12MB · PDF / DOCX / TXT</span>
          </label>

          <div className="mt-3 text-[11px] text-[var(--muted)]">Or paste synopsis text</div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="mt-1 h-40 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 font-mono text-[12px] leading-relaxed outline-none focus:border-[var(--accent)]"
            placeholder="Paste protocol synopsis or eligibility text…"
          />

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy || !raw.trim()}
              onClick={() => void runPipeline()}
              className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Working…" : "Generate shortlist"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "parsed" && parsed ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Parsed protocol</h2>
              <p className="text-[12px] text-[var(--muted)]">{parsed.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("input")}
              className="text-[12px] text-[var(--muted)] underline"
            >
              Edit / re-upload
            </button>
          </div>

          {parsed.eligibilityRelations?.length ? (
            <div className="mb-4">
              <div className="text-[11px] font-medium text-[var(--muted)]">
                Structured eligibility
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {parsed.eligibilityRelations.slice(0, 14).map((r) => (
                  <span
                    key={`${r.name}-${r.label}-${r.section}`}
                    className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--bg)] px-2.5 py-0.5 text-[11px]"
                    title={`${r.variableType} · ${r.section} · score ${r.score.toFixed(2)}`}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["Indication", parsed.indication],
                ["Phase", parsed.phase],
                ["Enrollment", { ...parsed.enrollmentTarget, value: String(parsed.enrollmentTarget.value) }],
                [
                  "Geography",
                  {
                    ...parsed.geography,
                    value: parsed.geography.value.length
                      ? parsed.geography.value.join(", ")
                      : "US (no state filter)",
                  },
                ],
                ["Biomarkers", parsed.biomarkers],
                ["Visit burden", parsed.visitBurden],
                ["Inclusion", parsed.inclusion],
                ["Exclusion", parsed.exclusion],
              ] as const
            ).map(([label, field]) => (
              <ParsedRow
                key={label}
                label={label}
                value={field.value || "—"}
                confidence={field.confidence}
                evidence={field.evidence}
                confClass={confColor[field.confidence]}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runMatchFromParsed(parsed)}
              className="h-10 rounded-md bg-[var(--accent)] px-5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Matching…" : "Generate shortlist"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "matches" && result ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold">Evidence-backed site shortlist</h2>
              <p className="text-[12px] text-[var(--muted)]">
                {result.matches.length} ranked · match evidence + risk flags ·{" "}
                {result.parsed.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep("input")}
              className="text-[12px] text-[var(--muted)] underline"
            >
              New protocol
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="overflow-hidden rounded-xl border border-[var(--line)]">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-[var(--line)] bg-[var(--hover)] text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Site</th>
                    <th className="px-2 py-2 font-medium">Match</th>
                    <th className="px-2 py-2 font-medium">Overall</th>
                    <th className="px-2 py-2 font-medium">Lift</th>
                    <th className="px-2 py-2 font-medium">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((row) => (
                    <tr
                      key={row.site.id}
                      onClick={() => setSelected(row)}
                      className={`cursor-pointer border-b border-[var(--line)] hover:bg-[var(--hover)] ${
                        selected?.site.id === row.site.id ? "bg-[var(--accent-soft)]/40" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono tabular">{row.rank}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{row.site.name}</div>
                        <div className="text-[11px] text-[var(--muted)]">{row.site.hq}</div>
                      </td>
                      <td className="px-2 py-2 font-mono tabular">{row.matchScore}</td>
                      <td className="px-2 py-2">
                        <ScoreChip value={row.scores.overallSiteQuality} compact />
                      </td>
                      <td className="px-2 py-2 font-mono tabular">
                        {row.liftability.toFixed(2)}
                      </td>
                      <td className="max-w-[220px] truncate px-2 py-2 text-[var(--muted)]">
                        {row.aiNarrative || row.headline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="h-fit rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              {selected ? <RationalePanel match={selected} /> : null}
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ParsedRow({
  label,
  value,
  confidence,
  evidence,
  confClass,
}: {
  label: string;
  value: string;
  confidence: string;
  evidence: string;
  confClass: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-[var(--muted)]">{label}</span>
        <span className={`text-[10px] uppercase ${confClass}`}>{confidence}</span>
      </div>
      <div className="mt-0.5 text-[13px] font-medium leading-snug">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--muted)]">{evidence}</div>
    </div>
  );
}

function RationalePanel({ match }: { match: TrialSiteMatch }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {match.aiNarrative ? "Match evidence" : "Why this match"}
      </div>
      <h3 className="mt-1 text-[14px] font-semibold leading-snug">{match.site.name}</h3>
      <p className="mt-1 text-[12px] text-[var(--accent)]">{match.headline}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ScoreChip label="Overall" value={match.scores.overallSiteQuality} compact />
        <ScoreChip label="Recruit" value={match.scores.recruitmentStrength} compact />
        <span className="font-mono text-[11px] text-[var(--muted)]">
          Match {match.matchScore} · Lift {match.liftability.toFixed(2)}
        </span>
      </div>

      {match.aiNarrative ? (
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--ink)]">{match.aiNarrative}</p>
      ) : null}

      {match.aiStrengths?.length ? (
        <div className="mt-3">
          <div className="text-[11px] font-medium">Strengths</div>
          <ul className="mt-1 space-y-1 text-[12px] text-[var(--muted)]">
            {match.aiStrengths.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.aiRisks?.length ? (
        <div className="mt-3">
          <div className="text-[11px] font-medium">Risks</div>
          <ul className="mt-1 space-y-1 text-[12px] text-amber-800">
            {match.aiRisks.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.aiInteraAngle ? (
        <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--accent-soft)]/40 px-2.5 py-2 text-[12px] leading-snug">
          <span className="font-medium text-[var(--accent)]">Intera Lift · </span>
          {match.aiInteraAngle}
        </div>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-3">
        <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
          Algorithm evidence
        </div>
        {match.rationale.slice(0, 5).map((r) => (
          <RationaleItem key={r.title + r.detail.slice(0, 20)} point={r} />
        ))}
      </div>

      <Link
        href={`/sites/${match.site.id}`}
        className="mt-4 inline-block text-[12px] font-medium text-[var(--accent)] underline"
      >
        Open full site profile
      </Link>
    </>
  );
}

function RationaleItem({ point }: { point: RationalePoint }) {
  const tone =
    point.kind === "risk"
      ? "border-amber-200 bg-amber-50/50"
      : point.kind === "lift"
        ? "border-blue-100 bg-[var(--accent-soft)]/50"
        : "border-[var(--line)]";
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${tone}`}>
      <div className="text-[11px] font-medium">{point.title}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">{point.detail}</div>
    </div>
  );
}
