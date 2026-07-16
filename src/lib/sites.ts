import type { Site, SitesPayload } from "./types";
import payload from "../../data/sites.json";

const data = payload as SitesPayload;

export function getMeta() {
  return data.meta;
}

export function getAllSites(): Site[] {
  return data.sites;
}

export function getSiteById(id: string): Site | undefined {
  return data.sites.find((s) => s.id === id);
}

export function getSitesByIds(ids: string[]): Site[] {
  const set = new Set(ids);
  return data.sites.filter((s) => set.has(s.id));
}

export function searchSites(query: string, limit = 40): Site[] {
  const q = query.trim().toLowerCase();
  if (!q) return data.sites.slice(0, limit);

  const tokens = q.replace(/^[~@$#^!?]+/, "").split(/\s+/).filter(Boolean);

  const scored = data.sites.map((site) => {
    const hay = [
      site.name,
      site.hq,
      site.type,
      site.states,
      site.therapeuticAreas,
      site.therapeuticSpecialties,
      site.sponsorsWorkedWith,
      site.crosWorkedWith,
      site.notes,
      site.ceo,
      site.languages,
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    if (site.name.toLowerCase().includes(q)) score += 50;
    for (const t of tokens) {
      if (hay.includes(t)) score += 10;
      if (site.name.toLowerCase().includes(t)) score += 15;
      if (site.states.toLowerCase().includes(t)) score += 8;
      if (site.therapeuticAreas.toLowerCase().includes(t)) score += 12;
      if (site.sponsorsWorkedWith.toLowerCase().includes(t)) score += 14;
    }
    if (site.scores.overallSiteQuality != null) {
      score += site.scores.overallSiteQuality / 20;
    }
    return { site, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.site);
}

/** CT.gov pulls often cap at 800 trials — treat as over-broad/unreliable volume. */
export const HIST_TRIALS_CAP = 800;

/** Minimum indication fit to enter the primary shortlist when enough aligned sites exist. */
export const INDICATION_GATE = 0.45;

export function isOverBroadCapped(site: Site): boolean {
  return site.histTrials >= HIST_TRIALS_CAP;
}

export function dataQualityFlags(site: Site): string[] {
  const flags: string[] = [];
  if (isOverBroadCapped(site)) {
    flags.push("Over-broad match (capped) — verify");
  }
  if (/low/i.test(site.performanceMatchConfidence || "")) {
    flags.push("Low performance-match confidence");
  }
  return flags;
}

type TherapeuticFamily =
  | "oncology"
  | "cardiometabolic"
  | "cns"
  | "infectious"
  | "dermatology"
  | "gi"
  | "respiratory"
  | "womens"
  | "vaccine"
  | "general";

const FAMILY_PATTERNS: Record<TherapeuticFamily, RegExp[]> = {
  oncology: [
    /oncolog/,
    /\bcancer\b/,
    /tumor/,
    /haematolog|hematolog/,
    /nsclc/,
    /lung cancer/,
    /melanoma/,
    /carcinoma/,
    /solid tumor/,
    /leukemia|lymphoma|myeloma/,
    /chemo|immuno-?oncolog|car-t/,
  ],
  cardiometabolic: [
    /cardio/,
    /metabolic/,
    /obesity/,
    /diabetes|t2d|type 2/,
    /\bheart\b/,
    /lipid|cholester/,
    /hypertens/,
    /kidney|renal|nephrol/,
    /heart failure|cad\b|coronary/,
    /nash|fatty liver|glp/,
  ],
  cns: [/alzheimer|dementia|\bcns\b|neuro|psychiatr|parkinson|ms\b|multiple sclerosis/],
  infectious: [/infectio|antiviral|hiv\b|covid|vaccine(?!d)/],
  dermatology: [/dermatol|psoriasis|atopic|eczema/],
  gi: [/gastro|ibd|crohn|ulcerative colitis|hepatol/],
  respiratory: [/pulmon|asthma|copd|respiratory(?! syncytial)/],
  womens: [/women.?s health|gynecol|obstetric|contracept|endometri/],
  vaccine: [/\bvaccine|\bimmuniz/],
  general: [/all therapeutic|multi-?specialt|multispecialty|general medicine|broad/],
};

export function detectTherapeuticFamilies(text: string): TherapeuticFamily[] {
  const t = text.toLowerCase();
  const found: TherapeuticFamily[] = [];
  for (const [family, patterns] of Object.entries(FAMILY_PATTERNS) as [
    TherapeuticFamily,
    RegExp[],
  ][]) {
    if (family === "general") continue;
    if (patterns.some((p) => p.test(t))) found.push(family);
  }
  return found;
}

function tokenHits(hay: string, needle: string): number {
  const parts = needle
    .split(/[\/,;]|\band\b/)
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length >= 3);
  let hits = 0;
  for (const p of parts) {
    if (hay.includes(p)) hits += 1;
  }
  const synonyms: Record<string, string[]> = {
    obesity: ["obesity", "weight", "metabolic", "diabetes", "cardiometabolic", "glp"],
    diabetes: ["diabetes", "t2d", "type 2", "metabolic", "cardiometabolic"],
    alzheimer: ["alzheimer", "alzheimers", "dementia", "cns", "neuro"],
    cardiometabolic: ["cardio", "metabolic", "obesity", "diabetes", "heart", "lipid"],
    oncology: ["oncology", "cancer", "tumor", "hematolog", "nsclc", "lung cancer"],
    nsclc: ["nsclc", "lung cancer", "non-small", "egfr", "oncology", "cancer"],
  };
  for (const [key, syns] of Object.entries(synonyms)) {
    if (needle.includes(key) || syns.some((s) => needle.includes(s))) {
      if (syns.some((s) => hay.includes(s))) hits += 1.25;
    }
  }
  return hits;
}

/**
 * Indication fit prefers primary Therapeutic Areas over specialty laundry lists / notes.
 * Specialty-only mention of a family (e.g. "oncology" tucked into a cardiometabolic list)
 * is capped as weak — it must not outrank genuine indication centers.
 */
export function indicationFit(site: Site, indication: string): number {
  const needle = indication.toLowerCase().trim();
  if (!needle) return 0.5;

  const areas = (site.therapeuticAreas || "").toLowerCase();
  const specialties = (site.therapeuticSpecialties || "").toLowerCase();
  const notes = (site.notes || "").toLowerCase();

  const indFamilies = detectTherapeuticFamilies(needle);
  const areaFamilies = detectTherapeuticFamilies(areas);
  const specialtyFamilies = detectTherapeuticFamilies(specialties);

  const areaHits = tokenHits(areas, needle);
  const specialtyHits = tokenHits(specialties, needle);
  const noteHits = tokenHits(notes, needle);

  const alignedFamilies = indFamilies.filter((f) => areaFamilies.includes(f));
  const familyAligned = alignedFamilies.length > 0;
  const focusedAlignment = isFocusedFamilyMention(areas, alignedFamilies, areaFamilies);
  const specialtyOnlyFamily =
    indFamilies.length > 0 &&
    !familyAligned &&
    indFamilies.some((f) => specialtyFamilies.includes(f));
  const familyConflict =
    indFamilies.length > 0 && areaFamilies.length > 0 && !familyAligned;

  let score = 0;
  if (familyAligned && focusedAlignment) {
    score = Math.min(1, 0.55 + areaHits * 0.18);
  } else if (familyAligned && !focusedAlignment) {
    // Laundry-list / “16+ areas including X” — not a specialist claim
    score = Math.min(0.42, 0.3 + areaHits * 0.04);
  } else if (areaHits > 0) {
    score = Math.min(0.75, 0.35 + areaHits * 0.15);
  } else if (specialtyOnlyFamily || specialtyHits > 0) {
    score = Math.min(0.32, 0.18 + specialtyHits * 0.06);
  } else if (noteHits > 0) {
    score = Math.min(0.28, 0.15 + noteHits * 0.05);
  } else if (/all therapeutic|multi-?specialt|multispecialty/i.test(areas)) {
    score = 0.35;
  } else {
    score = 0.12;
  }

  if (familyConflict && specialtyOnlyFamily) {
    score = Math.min(score, 0.28);
  } else if (familyConflict && score < 0.4) {
    score = Math.min(score, 0.22);
  }

  return Math.round(score * 100) / 100;
}

/** Focused = family is a real specialty, not one token in a broad laundry list. */
function looksLikeLaundryList(areas: string): boolean {
  if (/\d+\+?\s*(specialized\s+)?(therapeutic\s+)?areas?\b/i.test(areas)) return true;
  if (/^broad\s*:/i.test(areas.trim())) return true;
  if (/multiple therapeutic areas/i.test(areas)) return true;
  if (/\bincluding\b/i.test(areas) && areas.split(/,/).length >= 4) return true;
  return areas.split(/,/).length >= 7;
}

function leadingTherapeuticClause(areas: string): string {
  return (areas.split(/,|;|\bincluding\b/i)[0] || areas).trim().slice(0, 70);
}

function isFocusedFamilyMention(
  areas: string,
  aligned: TherapeuticFamily[],
  areaFamilies: TherapeuticFamily[],
): boolean {
  if (!aligned.length) return false;
  // Laundry / multi-family profiles: only count if the indication family leads
  if (looksLikeLaundryList(areas) || areaFamilies.length >= 4) {
    const lead = leadingTherapeuticClause(areas);
    return aligned.some((f) => FAMILY_PATTERNS[f].some((p) => p.test(lead)));
  }
  if (areaFamilies.length <= 3) return true;
  const head = areas.slice(0, Math.max(90, Math.floor(areas.length * 0.45)));
  return aligned.some((f) => FAMILY_PATTERNS[f].some((p) => p.test(head)));
}

/** True when primary therapeutic areas support the indication family with focused depth. */
export function hasPrimaryIndicationAlignment(site: Site, indication: string): boolean {
  const indFamilies = detectTherapeuticFamilies(indication);
  if (!indFamilies.length) return indicationFit(site, indication) >= 0.5;
  const areas = (site.therapeuticAreas || "").toLowerCase();
  const areaFamilies = detectTherapeuticFamilies(areas);
  const aligned = indFamilies.filter((f) => areaFamilies.includes(f));
  return isFocusedFamilyMention(areas, aligned, areaFamilies);
}

export function liftability(site: Site, indFit: number): number {
  return Math.round(indFit * (1 - site.recruitSophistication) * 100) / 100;
}
