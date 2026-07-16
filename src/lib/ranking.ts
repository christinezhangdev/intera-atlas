import {
  hasPrimaryIndicationAlignment,
  INDICATION_GATE,
  indicationFit,
  isOverBroadCapped,
  liftability,
} from "./sites";
import { parseProtocol, parsedToDraft } from "./protocol-parser";
import type { ProtocolDraft, RankedSite, Site } from "./types";

function pctRank(values: number[], value: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) if (v <= value) count++;
  return count / sorted.length;
}

function stateMatch(site: Site, geos: string[]): number {
  if (!geos.length) return 1;
  const states = site.states.toLowerCase();
  const hq = site.hq.toLowerCase();
  let hits = 0;
  for (const g of geos) {
    const needle = g.toLowerCase().trim();
    if (!needle) continue;
    if (states.includes(needle) || hq.includes(needle)) hits++;
  }
  return hits / geos.length;
}

function effectiveHist(site: Site): number {
  return Math.min(site.histTrials, isOverBroadCapped(site) ? 120 : site.histTrials);
}

/**
 * Model v2-aligned ranking UI layer:
 * Layer 2 feature blend (indication-heavy) + Layer 3 Liftability.
 * Accrual Index is percentile of Ê_base proxy within candidates (cold-start).
 */
export function rankSitesForProtocol(
  sites: Site[],
  protocol: ProtocolDraft,
): RankedSite[] {
  const geos = protocol.geography;
  let candidates = sites.filter((s) => s.scorable);

  if (geos.length) {
    const geoFiltered = candidates.filter((s) => stateMatch(s, geos) > 0);
    if (geoFiltered.length >= 20) candidates = geoFiltered;
  }
  if (protocol.requireSpanish) {
    const esp = candidates.filter((s) => s.spanish);
    if (esp.length >= 10) candidates = esp;
  }
  if (protocol.requireDct) {
    const dct = candidates.filter(
      (s) => s.mentionsDct || /decentral|hybrid|home/i.test(s.decentralizedCapabilities),
    );
    if (dct.length >= 5) candidates = dct;
  }

  const query = `${protocol.indication} ${protocol.disease}`;
  const withInd = candidates.map((site) => ({
    site,
    ind: indicationFit(site, query),
    primary: hasPrimaryIndicationAlignment(site, query),
  }));
  const deCapped = withInd.filter((x) => !isOverBroadCapped(x.site) || x.primary);
  const poolBase = deCapped.length >= 15 ? deCapped : withInd;
  const gated = poolBase.filter((x) => x.primary && x.ind >= INDICATION_GATE);
  const pool =
    gated.length >= 8
      ? gated
      : poolBase.filter((x) => x.ind >= 0.28).length >= 10
        ? poolBase.filter((x) => x.ind >= 0.28)
        : poolBase;

  const poolSites = pool.map((p) => p.site);
  const histVals = poolSites.map((s) => effectiveHist(s));
  const enrollVals = poolSites.map((s) => s.totalEnrollment);
  const opsVals = poolSites.map((s) => s.scores.operationalMaturity ?? 0);
  const activeVals = poolSites.map((s) => s.activeNow);

  const rho = protocol.restrictiveness;

  const scored = pool.map(({ site, ind, primary }) => {
    const enroll =
      0.6 * pctRank(histVals, effectiveHist(site)) +
      0.4 * pctRank(enrollVals, site.totalEnrollment);
    const ops = pctRank(opsVals, site.scores.operationalMaturity ?? 0);
    const recruit = site.recruitSophistication;
    const capacity = 1 - Math.min(1, site.activeNow / (Math.max(...activeVals, 1) || 1));
    const startup = site.startupProxy;
    const diversity = site.spanish ? 1 : protocol.requireSpanish ? 0 : 0.4;
    const geo = stateMatch(site, geos);

    const match =
      100 *
      (0.4 * ind +
        0.12 * enroll +
        0.12 * ops +
        0.1 * recruit +
        0.08 * capacity +
        0.08 * startup +
        0.05 * diversity +
        0.05 * geo -
        (isOverBroadCapped(site) ? 0.12 : 0) -
        (primary ? 0 : 0.18));

    const baseProxy =
      (site.enrollmentVelocity || 1) * rho * (0.5 + 0.5 * ind) * (0.7 + 0.3 * ops);
    const lift = liftability(site, ind);
    const expectedWithIntera = baseProxy * (1 + 0.35 * lift);

    const reasons: string[] = [];
    if (primary && ind >= 0.7) reasons.push("Strong indication / therapeutic fit");
    else if (primary && ind >= 0.4) reasons.push("Partial therapeutic fit");
    else reasons.push("Adjacent/backup — verify indication depth");
    if (isOverBroadCapped(site)) {
      reasons.push("Over-broad match (capped) — verify volume signals");
    }
    if ((site.scores.overallSiteQuality ?? 0) >= 80) {
      reasons.push(`Elite Overall Site Quality (${site.scores.overallSiteQuality})`);
    }
    if ((site.scores.recruitmentStrength ?? 0) >= 75) {
      reasons.push(`High Recruitment Strength (${site.scores.recruitmentStrength})`);
    }
    if (lift >= 0.5 && primary) {
      reasons.push(`High Intera Lift (${lift.toFixed(2)}) — patients without digital recruit`);
    }
    if (site.completionRate && site.completionRate >= 85) {
      reasons.push(`High completion rate (${site.completionRate}%)`);
    }
    if (geo >= 0.5 && geos.length) reasons.push("Matches requested geography");
    if (site.spanish && protocol.requireSpanish) reasons.push("Spanish-language access");

    return {
      site,
      rank: 0,
      match: Math.round(Math.max(0, match) * 10) / 10,
      accrualIndex: 0,
      indFit: Math.round(ind * 100) / 100,
      enroll: Math.round(enroll * 100) / 100,
      ops: Math.round(ops * 100) / 100,
      recruit: Math.round(recruit * 100) / 100,
      capacity: Math.round(capacity * 100) / 100,
      startup: Math.round(startup * 100) / 100,
      diversity: Math.round(diversity * 100) / 100,
      geo: Math.round(geo * 100) / 100,
      liftability: lift,
      expectedWithIntera,
      reasons,
      confidence: site.performanceMatchConfidence || (site.scorable ? "model" : "low"),
      _baseProxy: baseProxy,
    };
  });

  const bases = scored.map((s) => s._baseProxy);
  const ranked = scored
    .map((s) => ({
      ...s,
      accrualIndex: Math.round(pctRank(bases, s._baseProxy) * 100),
    }))
    .sort((a, b) => b.match - a.match || b.indFit - a.indFit || b.accrualIndex - a.accrualIndex);

  return ranked.map(({ _baseProxy: _, ...row }, i) => ({
    ...row,
    rank: i + 1,
  }));
}

export function estimateRestrictiveness(text: string): number {
  const t = text.toLowerCase();
  let hits = 0;
  const strict = [
    "biomarker",
    "mutation",
    "prior therapy",
    "failed",
    "exclusion",
    "egfr",
    "pd-l1",
    "bmi",
    "hbA1c",
    "hba1c",
    "stage iv",
    "metastatic",
    "washout",
    "contraindication",
  ];
  for (const s of strict) if (t.includes(s)) hits++;
  // 1 = broad, lower = restrictive
  return Math.max(0.45, Math.min(1, 1 - hits * 0.04));
}

/** @deprecated Prefer parseProtocol from protocol-parser */
export function parseProtocolText(raw: string): Omit<ProtocolDraft, "id"> {
  const { id: _id, ...rest } = parsedToDraft(parseProtocol(raw));
  return rest;
}
