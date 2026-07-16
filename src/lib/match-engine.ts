import {
  relationsForRationale,
  type EligibilityRelation,
} from "./eligibility";
import {
  dataQualityFlags,
  hasPrimaryIndicationAlignment,
  INDICATION_GATE,
  indicationFit,
  isOverBroadCapped,
  liftability,
} from "./sites";
import type { ParsedProtocol } from "./protocol-parser";
import { parsedToDraft } from "./protocol-parser";
import type { ProtocolDraft, QualityScores, Site } from "./types";

export type RationalePoint = {
  kind: "fit" | "quality" | "capacity" | "geo" | "lift" | "risk" | "evidence";
  title: string;
  detail: string;
};

export type TrialSiteMatch = {
  rank: number;
  site: Site;
  matchScore: number;
  accrualIndex: number;
  indFit: number;
  liftability: number;
  headline: string;
  rationale: RationalePoint[];
  matchedKeywords: string[];
  confidence: string;
  scores: QualityScores;
  aiNarrative?: string;
  aiStrengths?: string[];
  aiRisks?: string[];
  aiInteraAngle?: string;
};

export type MatchResult = {
  protocol: ProtocolDraft;
  parsed: ParsedProtocol;
  matches: TrialSiteMatch[];
  searched: number;
  filtered: number;
};

export { INDICATION_GATE };

function pctRank(values: number[], value: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) if (v <= value) count++;
  return count / sorted.length;
}

function stateMatch(site: Site, geos: string[]): number {
  if (!geos.length) return 1;
  const hay = `${site.states} ${site.hq}`.toLowerCase();
  let hits = 0;
  for (const g of geos) {
    if (hay.includes(g.toLowerCase())) hits++;
  }
  return hits / geos.length;
}

function keywordHits(site: Site, keywords: string[]): string[] {
  // Prefer primary therapeutic areas — do not treat specialty laundry lists as proof
  const areas = (site.therapeuticAreas || "").toLowerCase();
  const specialties = (site.therapeuticSpecialties || "").toLowerCase();
  const matched: string[] = [];
  for (const k of keywords) {
    if (k.length <= 2) continue;
    const needle = k.toLowerCase();
    if (areas.includes(needle)) matched.push(k);
    else if (specialties.includes(needle) && hasPrimaryIndicationAlignment(site, k)) {
      matched.push(k);
    }
  }
  return matched;
}

function eligibilityTokens(relations: EligibilityRelation[]): string[] {
  const out: string[] = [];
  for (const r of relations) {
    if (r.name === "biomarker" && r.value) out.push(...r.value);
    if (r.name === "cancer" || r.name === "chronic disease") {
      out.push(...(r.value || []), r.name);
    }
  }
  return out.map((t) => t.toLowerCase());
}

function biomarkerSpecialtyBoost(site: Site, relations: EligibilityRelation[]): number {
  const biomarkers = relations.filter((r) => r.name === "biomarker");
  if (!biomarkers.length) return 0;
  if (!hasPrimaryIndicationAlignment(site, "oncology cancer")) return 0;
  const hay = `${site.therapeuticAreas} ${site.therapeuticSpecialties}`.toLowerCase();
  let hits = 0;
  for (const r of biomarkers) {
    for (const v of r.value || [r.label]) {
      if (hay.includes(v.toLowerCase())) hits++;
    }
  }
  return Math.min(0.12, hits * 0.04);
}

function effectiveHistTrials(site: Site): number {
  // Cap inflated footprints so 800-trial stubs don't dominate enroll rank
  return Math.min(site.histTrials, isOverBroadCapped(site) ? 120 : site.histTrials);
}

function buildRationale(
  site: Site,
  parsed: ParsedProtocol,
  ind: number,
  lift: number,
  geo: number,
  matchedKeywords: string[],
  primaryAligned: boolean,
): { headline: string; rationale: RationalePoint[] } {
  const rationale: RationalePoint[] = [];
  const overall = site.scores.overallSiteQuality;
  const recruit = site.scores.recruitmentStrength;
  const ops = site.scores.operationalMaturity;
  const ther = site.scores.therapeuticExpertise;
  const dq = dataQualityFlags(site);

  if (dq.includes("Over-broad match (capped) — verify")) {
    rationale.push({
      kind: "risk",
      title: "Data quality: over-broad footprint",
      detail:
        "Historical trial count appears capped (~800). Volume signals are unreliable — verify true therapeutic depth before selecting.",
    });
  }

  if (primaryAligned && matchedKeywords.length) {
    rationale.push({
      kind: "fit",
      title: "Therapeutic match",
      detail: `Primary therapeutic areas cite ${matchedKeywords.slice(0, 4).join(", ")} — aligned with “${parsed.indication.value}”.`,
    });
  } else if (primaryAligned && ind >= 0.45) {
    rationale.push({
      kind: "fit",
      title: "Therapeutic family alignment",
      detail: `Indication fit ${ind.toFixed(2)} from primary therapeutic areas matching “${parsed.indication.value}”.`,
    });
  } else if (ind >= 0.3) {
    rationale.push({
      kind: "risk",
      title: "Adjacent / backup — verify indication depth",
      detail: `Primary areas are “${site.therapeuticAreas.slice(0, 120)}”. Not a clear specialist for “${parsed.indication.value}”; treat as backup only.`,
    });
  } else {
    rationale.push({
      kind: "risk",
      title: "Indication mismatch",
      detail: `Limited overlap with “${parsed.indication.value}”. Quality/volume alone should not carry this site for this protocol.`,
    });
  }

  if (site.therapeuticAreas) {
    rationale.push({
      kind: "evidence",
      title: "Site therapeutic areas",
      detail: site.therapeuticAreas.slice(0, 160) + (site.therapeuticAreas.length > 160 ? "…" : ""),
    });
  }

  if (site.histTrials >= 100 && !isOverBroadCapped(site)) {
    rationale.push({
      kind: "evidence",
      title: "Historical trial footprint",
      detail: `${site.histTrials} CT.gov-linked trials · ${site.phase3} Phase 3 · ${site.completionRate ?? "—"}% completion. Strong proxy for having run similar protocols.`,
    });
  } else if (isOverBroadCapped(site)) {
    rationale.push({
      kind: "evidence",
      title: "Historical trial footprint (capped)",
      detail: `Reported ${site.histTrials} trials (cap). Do not treat as ${site.histTrials} proven similar-indication studies.`,
    });
  }

  if (overall != null) {
    rationale.push({
      kind: "quality",
      title: "Overall Site Quality",
      detail: `Overall ${overall} · Recruit ${recruit ?? "—"} · Ops ${ops ?? "—"} · Ther ${ther ?? "—"}. Scorecard on observed CT.gov + web signals — Ther score ≠ indication-specific expertise.`,
    });
  }

  if (parsed.geography.value.length) {
    if (geo > 0) {
      rationale.push({
        kind: "geo",
        title: "Geography fit",
        detail: `Overlaps requested ${parsed.geography.value.slice(0, 4).join(", ")} (site states/HQ).`,
      });
    } else {
      rationale.push({
        kind: "risk",
        title: "Outside preferred geography",
        detail: `Protocol prefers ${parsed.geography.value.slice(0, 3).join(", ")}; site footprint is ${site.states.slice(0, 80) || site.hq}.`,
      });
    }
  }

  if (site.activeNow > 80) {
    rationale.push({
      kind: "risk",
      title: "High concurrent load",
      detail: `${site.activeNow} studies marked active — competing demand may slow startup.`,
    });
  } else if (site.activeNow > 0) {
    rationale.push({
      kind: "capacity",
      title: "Active capacity",
      detail: `${site.activeNow} active studies · ${site.investigators ?? "—"} investigators on record.`,
    });
  }

  if (parsed.requireSpanish) {
    rationale.push({
      kind: site.spanish ? "fit" : "risk",
      title: site.spanish ? "Spanish access" : "Spanish not detected",
      detail: site.spanish
        ? `Languages: ${site.languages}`
        : "Protocol prefers Spanish; site language field does not list Spanish.",
    });
  }

  const criteria = relationsForRationale(parsed.eligibilityRelations || [], 5);
  if (criteria.length) {
    rationale.push({
      kind: "evidence",
      title: "Structured eligibility",
      detail: `Protocol criteria used in ranking: ${criteria.join(" · ")}.`,
    });
  }

  const biomarkerRels = (parsed.eligibilityRelations || []).filter((r) => r.name === "biomarker");
  if (biomarkerRels.length && primaryAligned) {
    const toks = biomarkerRels.flatMap((r) => r.value || [r.label]);
    const hay = `${site.therapeuticAreas} ${site.therapeuticSpecialties}`.toLowerCase();
    const hits = toks.filter((t) => hay.includes(t.toLowerCase()));
    if (hits.length) {
      rationale.push({
        kind: "fit",
        title: "Biomarker / specialty overlap",
        detail: `Site profile aligns with ${hits.slice(0, 3).join(", ")}.`,
      });
    }
  }

  if (lift >= 0.45 && primaryAligned) {
    rationale.push({
      kind: "lift",
      title: "High Intera Lift",
      detail: `Lift ${lift.toFixed(2)} = indication fit × (1 − recruit sophistication ${site.recruitSophistication}). Strong candidate to activate TryIntera.`,
    });
  } else if (site.recruitSophistication >= 0.6) {
    rationale.push({
      kind: "lift",
      title: "Already digitally recruiting",
      detail: `Recruit sophistication ${site.recruitSophistication} — less incremental Lift, still a strong organic enroller.`,
    });
  }

  let headline = "Solid operational backup";
  if (primaryAligned && ind >= 0.7 && (overall ?? 0) >= 80) {
    headline = "Best-fit high-quality site for this protocol";
  } else if (primaryAligned && ind >= 0.7) {
    headline = "Strong therapeutic match";
  } else if (primaryAligned && lift >= 0.5) {
    headline = "High Lift — Intera can move the needle here";
  } else if (!primaryAligned && (overall ?? 0) >= 85) {
    headline = "Elite quality; verify indication depth";
  } else if (!primaryAligned) {
    headline = "Adjacent/backup — verify indication depth";
  }

  return { headline, rationale };
}

/**
 * Find best-matching trial sites for a parsed protocol, with explicit rationale.
 */
export function matchTrialSites(
  sites: Site[],
  parsed: ParsedProtocol,
  limit = 25,
): MatchResult {
  const protocol = parsedToDraft(parsed);
  const geos = protocol.geography;
  let candidates = sites.filter((s) => s.scorable);

  if (geos.length) {
    const geoFiltered = candidates.filter((s) => stateMatch(s, geos) > 0);
    if (geoFiltered.length >= 15) candidates = geoFiltered;
  }
  if (protocol.requireSpanish) {
    const esp = candidates.filter((s) => s.spanish);
    if (esp.length >= 8) candidates = esp;
  }
  if (protocol.requireDct) {
    const dct = candidates.filter(
      (s) => s.mentionsDct || /decentral|hybrid|home/i.test(s.decentralizedCapabilities),
    );
    if (dct.length >= 5) candidates = dct;
  }

  const query = `${protocol.indication} ${protocol.disease} ${parsed.keywords.join(" ")}`;

  const withInd = candidates.map((site) => ({
    site,
    ind: indicationFit(site, query),
    primary: hasPrimaryIndicationAlignment(site, query),
  }));

  // Drop over-broad capped records that lack primary indication alignment
  // (keep capped sites that are genuinely on-indication, e.g. Mayo oncology).
  const deCapped = withInd.filter(
    (x) => !isOverBroadCapped(x.site) || x.primary,
  );
  const poolBase = deCapped.length >= 15 ? deCapped : withInd;

  // Hard indication gate: when enough primary-aligned sites exist, restrict to them
  const gated = poolBase.filter((x) => x.primary && x.ind >= INDICATION_GATE);
  const pool =
    gated.length >= 8
      ? gated
      : poolBase.filter((x) => x.ind >= 0.28).length >= 10
        ? poolBase.filter((x) => x.ind >= 0.28)
        : poolBase;

  const poolSites = pool.map((p) => p.site);
  const histVals = poolSites.map((s) => effectiveHistTrials(s));
  const enrollVals = poolSites.map((s) =>
    isOverBroadCapped(s) ? Math.min(s.totalEnrollment, 50_000) : s.totalEnrollment,
  );
  const opsVals = poolSites.map((s) => s.scores.operationalMaturity ?? 0);
  const activeVals = poolSites.map((s) => s.activeNow);
  const maxActive = Math.max(...activeVals, 1);
  const rho = protocol.restrictiveness;

  const scored = pool.map(({ site, ind, primary }) => {
    const enroll =
      0.6 * pctRank(histVals, effectiveHistTrials(site)) +
      0.4 * pctRank(enrollVals, isOverBroadCapped(site) ? Math.min(site.totalEnrollment, 50_000) : site.totalEnrollment);
    const ops = pctRank(opsVals, site.scores.operationalMaturity ?? 0);
    const recruit = site.recruitSophistication;
    const capacity = 1 - Math.min(1, site.activeNow / maxActive);
    const startup = site.startupProxy;
    const diversity = site.spanish ? 1 : protocol.requireSpanish ? 0 : 0.4;
    const geo = stateMatch(site, geos);
    const matchedKeywords = keywordHits(site, [
      ...parsed.keywords,
      ...protocol.indication.toLowerCase().split(/\s+/),
      ...eligibilityTokens(parsed.eligibilityRelations || []),
    ]);

    const biomarkerBoost = biomarkerSpecialtyBoost(site, parsed.eligibilityRelations || []);
    const cappedPenalty = isOverBroadCapped(site) ? 0.12 : 0;
    const mismatchPenalty = primary ? 0 : 0.18;

    // Indication-heavy weights — quality alone must not beat specialists
    const matchScore =
      100 *
      (0.4 * Math.min(1, ind + biomarkerBoost) +
        0.12 * enroll +
        0.12 * ops +
        0.1 * recruit +
        0.08 * capacity +
        0.08 * startup +
        0.05 * diversity +
        0.05 * geo -
        cappedPenalty -
        mismatchPenalty);

    const baseProxy =
      (site.enrollmentVelocity || 1) * rho * (0.5 + 0.5 * ind) * (0.7 + 0.3 * ops);
    const lift = liftability(site, ind);
    const { headline, rationale } = buildRationale(
      site,
      parsed,
      ind,
      lift,
      geo,
      matchedKeywords,
      primary,
    );

    return {
      site,
      matchScore: Math.round(Math.max(0, matchScore) * 10) / 10,
      indFit: Math.round(ind * 100) / 100,
      liftability: lift,
      headline,
      rationale,
      matchedKeywords,
      confidence: site.performanceMatchConfidence || "model",
      scores: site.scores,
      _baseProxy: baseProxy,
    };
  });

  const bases = scored.map((s) => s._baseProxy);
  const matches: TrialSiteMatch[] = scored
    .map((s) => ({
      ...s,
      accrualIndex: Math.round(pctRank(bases, s._baseProxy) * 100),
      rank: 0,
    }))
    .sort((a, b) => b.matchScore - a.matchScore || b.indFit - a.indFit || b.accrualIndex - a.accrualIndex)
    .slice(0, limit)
    .map(({ _baseProxy: _, ...row }, i) => ({ ...row, rank: i + 1 }));

  return {
    protocol,
    parsed,
    matches,
    searched: sites.length,
    filtered: poolSites.length,
  };
}
