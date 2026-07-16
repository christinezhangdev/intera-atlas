import type { QualityScores } from "@/lib/types";

export type SearchableSite = {
  id: string;
  name: string;
  hq: string;
  type: string;
  states: string;
  therapeuticAreas: string;
  sponsorsWorkedWith: string;
  scores: {
    overallSiteQuality: number | null;
    recruitmentStrength?: number | null;
    operationalMaturity?: number | null;
    sponsorAttractiveness?: number | null;
    therapeuticExpertise?: number | null;
    band?: string;
  };
  histTrials?: number;
  activeNow?: number;
  notes?: string;
  therapeuticSpecialties?: string;
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "for",
  "of",
  "in",
  "on",
  "at",
  "to",
  "and",
  "or",
  "with",
  "that",
  "this",
  "sites",
  "site",
  "trial",
  "trials",
  "study",
  "studies",
  "network",
  "networks",
  "clinical",
  "research",
  "find",
  "show",
  "me",
  "get",
  "list",
  "please",
]);

const SYNONYMS: Record<string, string[]> = {
  obesity: ["obesit", "weight", "bmi", "metabolic", "cardiometabolic", "overweight"],
  obese: ["obesit", "weight", "bmi", "metabolic"],
  diabetes: ["diabet", "t2d", "t2dm", "glucose", "metabolic", "endocrin"],
  alzheimer: ["alzheimer", "dementia", "mci", "cns", "neuro"],
  oncology: ["oncolog", "cancer", "tumor", "hematolog", "neoplasm"],
  cancer: ["oncolog", "cancer", "tumor", "hematolog"],
  vaccine: ["vaccine", "immun", "infectious"],
  asthma: ["asthma", "copd", "pulmonary", "respiratory"],
  cardiology: ["cardio", "cardiac", "heart", "vascular", "hypertension"],
};

export type ParsedSiteQuery = {
  raw: string;
  /** tokens for relevance matching */
  tokens: string[];
  /** expanded synonym needles */
  needles: string[];
  stateFilter: string;
  sponsorFilter: string;
  /** best = high scores first; worst = low scores first among relevant */
  order: "best" | "worst";
};

export function parseSiteQuery(rawInput: string): ParsedSiteQuery {
  let raw = rawInput.trim().replace(/^[?~]+/, "");
  const lower = raw.toLowerCase();

  let order: "best" | "worst" = "best";
  if (/\b(worst|lowest|bottom|weakest|poorest)\b/i.test(lower)) order = "worst";
  else if (/\b(best|top|highest|strongest|elite)\b/i.test(lower)) order = "best";

  let stateFilter = "";
  const stateMatch = raw.match(/\bin\s+([A-Za-z .]+)$/i);
  if (stateMatch) {
    stateFilter = stateMatch[1].trim();
    raw = raw.replace(/\bin\s+[A-Za-z .]+$/i, "").trim();
  }

  let sponsorFilter = "";
  const sponsorMatch = raw.match(/work(?:s|ed)? with\s+(.+)/i);
  if (sponsorMatch) {
    sponsorFilter = sponsorMatch[1].trim();
    raw = raw.replace(/work(?:s|ed)? with\s+.+/i, "").trim();
  }

  // strip ranking / filler words before tokenization
  const cleaned = raw
    .replace(/\b(worst|best|top|lowest|highest|bottom|weakest|strongest|elite|poorest)\b/gi, " ")
    .replace(/\b(sites?|trials?|studies|networks?|investigators?)\b/gi, " ")
    .trim();

  const tokens = cleaned
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));

  const needles = new Set<string>();
  for (const t of tokens) {
    needles.add(t);
    const syns = SYNONYMS[t];
    if (syns) for (const s of syns) needles.add(s);
    // prefix stems for plurals
    if (t.endsWith("s") && t.length > 4) needles.add(t.slice(0, -1));
  }

  return {
    raw: rawInput.trim(),
    tokens,
    needles: [...needles],
    stateFilter,
    sponsorFilter,
    order,
  };
}

export function searchSitesSmart<T extends SearchableSite>(
  sites: T[],
  query: string,
  limit = 40,
): { results: T[]; parsed: ParsedSiteQuery; relevantCount: number } {
  const parsed = parseSiteQuery(query);
  if (!parsed.needles.length && !parsed.stateFilter && !parsed.sponsorFilter) {
    // empty after parse — show by overall quality
    const sorted = [...sites].sort(
      (a, b) =>
        (b.scores.overallSiteQuality ?? -1) - (a.scores.overallSiteQuality ?? -1),
    );
    return {
      results: (parsed.order === "worst" ? sorted.reverse() : sorted).slice(0, limit),
      parsed,
      relevantCount: sites.length,
    };
  }

  const scored = sites.map((site) => {
    const hay = [
      site.name,
      site.hq,
      site.states,
      site.type,
      site.therapeuticAreas,
      site.therapeuticSpecialties || "",
      site.sponsorsWorkedWith,
      site.notes || "",
    ]
      .join(" ")
      .toLowerCase();

    let relevance = 0;
    for (const n of parsed.needles) {
      if (hay.includes(n)) relevance += n.length >= 6 ? 14 : 10;
    }
    // name hit bonus
    for (const t of parsed.tokens) {
      if (site.name.toLowerCase().includes(t)) relevance += 20;
    }
    if (parsed.stateFilter) {
      if (site.states.toLowerCase().includes(parsed.stateFilter.toLowerCase())) {
        relevance += 30;
      } else if (parsed.needles.length) {
        // hard miss when state requested and TA also specified
        relevance *= 0.15;
      }
    }
    if (parsed.sponsorFilter) {
      if (
        site.sponsorsWorkedWith
          .toLowerCase()
          .includes(parsed.sponsorFilter.toLowerCase())
      ) {
        relevance += 35;
      }
    }

    const quality = site.scores.overallSiteQuality ?? 0;
    return { site, relevance, quality };
  });

  // Must have some topical relevance when needles exist
  const relevant = scored.filter((x) =>
    parsed.needles.length ? x.relevance >= 10 : x.relevance >= 0,
  );

  relevant.sort((a, b) => {
    // Keep weak matches below strong ones
    const aStrong = a.relevance >= 20 ? 1 : 0;
    const bStrong = b.relevance >= 20 ? 1 : 0;
    if (aStrong !== bStrong) return bStrong - aStrong;

    // Unscored (null overall) sink to bottom for quality rankings
    const aScored = a.quality > 0 ? 1 : 0;
    const bScored = b.quality > 0 ? 1 : 0;
    if (aScored !== bScored) return bScored - aScored;

    // Primary: quality direction (best/worst)
    if (parsed.order === "worst") {
      if (a.quality !== b.quality) return a.quality - b.quality;
    } else if (a.quality !== b.quality) {
      return b.quality - a.quality;
    }
    // Tie-break on relevance
    return b.relevance - a.relevance;
  });

  return {
    results: relevant.slice(0, limit).map((x) => x.site),
    parsed,
    relevantCount: relevant.length,
  };
}
