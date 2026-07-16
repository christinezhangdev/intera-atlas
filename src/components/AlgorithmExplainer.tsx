"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type Slide = {
  label: string;
  title: string;
  body: ReactNode;
};

const SLIDES: Slide[] = [
  {
    label: "Protocol",
    title: "Extract what the study needs",
    body: (
      <p>
        Atlas extracts enrollment requirements from a protocol, synopsis, or eligibility text —
        indication, phase, geography, visit burden, biomarkers, and structured inclusion /
        exclusion relations — so matching reasons over criteria, not keywords alone.
      </p>
    ),
  },
  {
    label: "Observed graph",
    title: "Start from Intera-owned history",
    body: (
      <p>
        Every organization begins as an observed public profile: CT.gov-linked trial history,
        quality scorecard dimensions, completion signals, and recruitment sophistication. Observed
        inputs stay Intera-owned.
      </p>
    ),
  },
  {
    label: "Verified signals",
    title: "Enrich without overwrite",
    body: (
      <p>
        Verified organizations can add public enrichment — description, capabilities, study
        interests, verified domain badge — without changing observed quality scores or trial
        history. Disputes go through Intera review.
      </p>
    ),
  },
  {
    label: "Private preferences",
    title: "Capacity and intent stay permissioned",
    body: (
      <p>
        Private matching signals — active capacity, seeking-studies status, sponsor preferences,
        protocol vaults, and portfolios — improve routing. They are used for matching and intros,
        not shown publicly unless shared.
      </p>
    ),
  },
  {
    label: "Fit score",
    title: "Protocol-aware shortlists",
    body: (
      <p>
        Atlas ranks candidates with indication fit, observed performance, capacity, geography, and
        verified preferences. The output is an evidence-backed shortlist — not a black-box score.
      </p>
    ),
  },
  {
    label: "Risks",
    title: "Surface what still needs confirmation",
    body: (
      <p>
        Each recommendation includes risk flags: missing capacity data, competing study load,
        weak indication depth, or lower-confidence footprint. Sponsors see what to verify before
        selecting.
      </p>
    ),
  },
  {
    label: "Intro path",
    title: "Route who should meet",
    body: (
      <p>
        Atlas recommends connections — save to portfolio, request intro, invite to study, or
        express interest. Relationships still close deals; Atlas is the routing layer.
      </p>
    ),
  },
];

export function AlgorithmExplainer() {
  const [index, setIndex] = useState(0);
  const [methodOpen, setMethodOpen] = useState(false);
  const last = SLIDES.length - 1;
  const slide = SLIDES[index];

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(last, next)));
    },
    [last],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.getElementById("how-it-works");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium tracking-wide text-[var(--accent)]">
            Decision system
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-tight">
            How Atlas recommends matches
          </h2>
        </div>
        <p className="text-[12px] text-[var(--muted)]">
          Step {index + 1} of {SLIDES.length}
        </p>
      </div>

      <div className="mt-6">
        <div className="flex gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              aria-label={`Go to ${s.label}`}
              onClick={() => go(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= index ? "bg-[var(--accent)]" : "bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          onChange={(e) => go(Number(e.target.value))}
          aria-label="Match explanation step"
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--line)] accent-[var(--accent)]"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => go(i)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                i === index
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 min-h-[180px] border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
          {slide.label}
        </div>
        <h3 className="mt-2 text-[20px] font-semibold tracking-tight">{slide.title}</h3>
        <div className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
          {slide.body}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-[13px] font-medium hover:bg-[var(--hover)] disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={index === last}
          onClick={() => go(index + 1)}
          className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <div className="mt-8 border-t border-[var(--line)] pt-6">
        <button
          type="button"
          onClick={() => setMethodOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={methodOpen}
        >
          <span className="text-[13px] font-semibold">Methodology notes</span>
          <span className="text-[12px] text-[var(--muted)]">{methodOpen ? "Hide" : "Show"}</span>
        </button>
        {methodOpen ? (
          <div className="mt-3 max-w-3xl space-y-3 text-[13px] leading-relaxed text-[var(--muted)]">
            <p>
              Atlas separates observed data, verified enrichment, private matching signals, and
              relationship activity. Claimed organizations can improve matching accuracy. They
              cannot overwrite observed site quality, trial history, or Intera-owned scoring
              inputs.
            </p>
            <p>
              Eligibility criteria are structured as machine-readable relations — nominal, ordinal,
              and numerical — following the schema popularized by Meta&apos;s open-source{" "}
              <a
                href="https://github.com/facebookresearch/Clinical-Trial-Parser"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[var(--ink)]"
              >
                Clinical-Trial-Parser
              </a>
              . Atlas implements that relation model in extraction and ranking so recommendations
              stay explainable down to criteria like age bounds, BMI, ECOG, biomarkers, and
              language requirements.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
