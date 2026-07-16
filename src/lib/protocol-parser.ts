import {
  estimateRestrictivenessFromRelations,
  extractLocalRelations,
  splitEligibilitySections,
  type EligibilityRelation,
} from "./eligibility";
import type { ProtocolDraft } from "./types";

export function estimateRestrictivenessLocal(text: string): number {
  const relations = extractLocalRelations(text);
  return estimateRestrictivenessFromRelations(relations, text);
}

export type ParsedField<T = string> = {
  value: T;
  confidence: "high" | "medium" | "low";
  evidence: string;
};

export type ParsedProtocol = {
  rawText: string;
  disease: ParsedField;
  indication: ParsedField;
  phase: ParsedField;
  enrollmentTarget: ParsedField<number>;
  geography: ParsedField<string[]>;
  inclusion: ParsedField;
  exclusion: ParsedField;
  biomarkers: ParsedField;
  visitBurden: ParsedField;
  ageRange: ParsedField;
  diversityGoals: ParsedField;
  requireSpanish: boolean;
  requireDct: boolean;
  keywords: string[];
  /** CTP-style structured eligibility (nominal / ordinal / numerical) */
  eligibilityRelations: EligibilityRelation[];
  restrictiveness: number;
  summary: string;
};

const STATE_ABBR: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const STATE_NAMES = Object.values(STATE_ABBR);

const INDICATION_PATTERNS: { re: RegExp; label: string; keywords: string[] }[] = [
  {
    re: /obesit|overweight|bmi\s*[≥>=]|weight\s*management|glp-?1/i,
    label: "Obesity / cardiometabolic",
    keywords: ["obesity", "metabolic", "diabetes", "cardiometabolic", "weight", "glp"],
  },
  {
    re: /type\s*2\s*diabetes|t2d|t2dm|niddm|hyperglycemia/i,
    label: "Type 2 diabetes",
    keywords: ["diabetes", "metabolic", "obesity", "cardiometabolic"],
  },
  {
    re: /alzheimer|mild cognitive|mci\b|dementia|amyloid/i,
    label: "Alzheimer's / dementia",
    keywords: ["alzheimer", "dementia", "cns", "neurology", "neuro"],
  },
  {
    re: /nash|masld|nafld|fatty\s*liver|steatohepat/i,
    label: "NASH / MASLD",
    keywords: ["nash", "liver", "metabolic", "hepat"],
  },
  {
    re: /oncolog|cancer|tumor|carcinoma|lymphoma|leukemia|melanoma/i,
    label: "Oncology",
    keywords: ["oncology", "cancer", "tumor", "hematolog"],
  },
  {
    re: /depress|anxiety|schizophren|bipolar|mdd\b|psychiatr/i,
    label: "CNS / psychiatry",
    keywords: ["psychiatr", "depression", "cns", "mental", "neuro"],
  },
  {
    re: /asthma|copd|respiratory|pulmonary/i,
    label: "Respiratory",
    keywords: ["asthma", "copd", "pulmonary", "respiratory", "lung"],
  },
  {
    re: /rheumat|psoriasis|ibd|crohn|ulcerative\s*colitis|lupus|autoimmune/i,
    label: "Immunology / autoimmune",
    keywords: ["rheumat", "autoimmune", "immun", "psoriasis", "ibd"],
  },
  {
    re: /vaccine|immunization|infectious/i,
    label: "Vaccines / infectious disease",
    keywords: ["vaccine", "infectious", "immun"],
  },
  {
    re: /heart\s*failure|cardiovascular|atherosclero|myocardial|hypertension|lipid/i,
    label: "Cardiovascular",
    keywords: ["cardio", "heart", "vascular", "hypertension", "lipid"],
  },
];

function pick(text: string, re: RegExp): string {
  const m = text.match(re);
  return m?.[1]?.trim() ?? "";
}

function field<T>(
  value: T,
  confidence: ParsedField<T>["confidence"],
  evidence: string,
): ParsedField<T> {
  return { value, confidence, evidence };
}

function emptyField(evidence = "Not found in text"): ParsedField {
  return field("", "low", evidence);
}

/**
 * Deterministic protocol parser — extracts structured trial requirements
 * from free text / synopsis. No API key required (MVP).
 */
export function parseProtocol(rawText: string): ParsedProtocol {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // Indication / disease
  let disease = pick(text, /(?:disease|condition)\s*[:\-–]\s*([^\n]+)/i);
  let indication = pick(text, /indication\s*[:\-–]\s*([^\n]+)/i);
  let indConf: ParsedField["confidence"] = indication || disease ? "high" : "low";
  let indEvidence = indication
    ? `Matched “Indication: …”`
    : disease
      ? `Matched “Disease/Condition: …”`
      : "";

  let keywords: string[] = [];
  if (!indication && !disease) {
    for (const p of INDICATION_PATTERNS) {
      if (p.re.test(text)) {
        disease = p.label;
        indication = p.label;
        keywords = p.keywords;
        indConf = "medium";
        indEvidence = `Inferred from clinical language matching ${p.label}`;
        break;
      }
    }
  } else {
    for (const p of INDICATION_PATTERNS) {
      if (p.re.test(`${indication} ${disease} ${text}`)) {
        keywords = p.keywords;
        break;
      }
    }
  }
  if (!disease) disease = indication || "Unspecified";
  if (!indication) indication = disease;

  // Phase
  const phaseRaw =
    pick(text, /phase\s*(i{1,3}|[123]|iv)/i) ||
    (/\bphase\s*3\b|\bphase\s*iii\b/i.test(text) ? "3" : "");
  const phaseMap: Record<string, string> = {
    i: "1",
    ii: "2",
    iii: "3",
    iv: "4",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
  };
  const phaseNorm = phaseMap[phaseRaw.toLowerCase()] || phaseRaw || "";
  const phase = phaseNorm
    ? field(phaseNorm, "high", `Found Phase ${phaseNorm}`)
    : field("3", "low", "Phase not stated — defaulted to 3 for ranking");

  // Enrollment
  const enrollStr =
    pick(text, /(\d[\d,]*)\s*(?:patients|subjects|participants)/i) ||
    pick(text, /enroll(?:ment|ing)?\s*(?:target|goal|n)?\s*[:\-–]?\s*(\d[\d,]*)/i);
  const enrollmentTarget = enrollStr
    ? field(Number(enrollStr.replace(/,/g, "")), "high", `Found enrollment n=${enrollStr}`)
    : field(600, "low", "Enrollment target not stated — defaulted to 600");

  // Geography
  const geos: string[] = [];
  const geoEvidence: string[] = [];
  for (const name of STATE_NAMES) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
      geos.push(name);
      geoEvidence.push(name);
    }
  }
  for (const [abbr, name] of Object.entries(STATE_ABBR)) {
    if (new RegExp(`\\b${abbr}\\b`).test(text) && !geos.includes(name)) {
      geos.push(name);
      geoEvidence.push(abbr);
    }
  }
  const nationwide = /\bunited states\b|\b\bUSA\b|\bU\.S\.A?\b|\bnationwide\b|\bmulti-?state\b/i.test(
    text,
  );
  const geography =
    geos.length > 0
      ? field(geos, "high", `Geography cues: ${geoEvidence.slice(0, 6).join(", ")}`)
      : nationwide
        ? field([] as string[], "medium", "US / nationwide — no state filter")
        : field([] as string[], "low", "No geography found — searching all US sites");

  // Inclusion / exclusion blocks (CTP-style section split)
  const sections = splitEligibilitySections(text);
  const inclusionBlock = sections.inclusion;
  const exclusionBlock = sections.exclusion;
  const inclusion = inclusionBlock
    ? field(inclusionBlock.slice(0, 900), "high", "Parsed Inclusion criteria section")
    : emptyField("No explicit Inclusion section");
  const exclusion = exclusionBlock
    ? field(exclusionBlock.slice(0, 900), "high", "Parsed Exclusion criteria section")
    : emptyField("No explicit Exclusion section");

  const eligibilityRelations = extractLocalRelations(text, sections);

  // Biomarkers / visit / age
  const biomarkers =
    pick(text, /biomarker[s]?\s*[:\-–]\s*([^\n]+)/i) ||
    (/\bhba1c\b|\begfr\b|\bpd-?l1\b|\bbmi\b/i.test(text)
      ? (text.match(/\b(HbA1c|eGFR|PD-L1|BMI|HER2|EGFR|KRAS)[^\n,;]{0,40}/gi) || [])
          .slice(0, 4)
          .join("; ")
      : "");
  const biomarkersField = biomarkers
    ? field(biomarkers, /biomarker/i.test(text) ? "high" : "medium", "Biomarker / lab cues detected")
    : emptyField();

  const visitBurden = /weekly|high burden|frequent visits|intensive/i.test(text)
    ? field("High", "medium", "High visit-burden language detected")
    : /monthly|standard visit|outpatient/i.test(text)
      ? field("Standard", "medium", "Standard visit cadence language")
      : pick(text, /visit burden\s*[:\-–]\s*([^\n]+)/i)
        ? field(pick(text, /visit burden\s*[:\-–]\s*([^\n]+)/i), "high", "Visit burden field")
        : field("Standard", "low", "Visit burden not stated");

  const ageRange =
    pick(text, /(?:aged?|ages?|age)\s*(\d{1,3}\s*[-–to]+\s*\d{1,3})/i) ||
    pick(text, /(\d{1,3})\s*(?:to|[-–])\s*(\d{1,3})\s*years?/i);
  const ageField = ageRange
    ? field(
        typeof ageRange === "string" && ageRange.includes("years")
          ? ageRange
          : ageRange,
        "high",
        "Age range extracted",
      )
    : emptyField();

  const requireSpanish = /spanish/i.test(text);
  const requireDct = /decentral|dct\b|hybrid trial|home visit|telehealth/i.test(text);
  const diversityGoals = requireSpanish
    ? field("Spanish-speaking access preferred", "high", "Spanish language requirement")
    : /diversit|underrepresent|equity/i.test(text)
      ? field("Diversity goals mentioned", "medium", "Diversity language in protocol")
      : emptyField();

  const restrictiveness = estimateRestrictivenessFromRelations(eligibilityRelations, text);

  // Prefer age from structured relations when free-text age failed
  const ageFromRel = eligibilityRelations.find((r) => r.name === "age");
  const ageFieldResolved =
    ageField.value || !ageFromRel
      ? ageField
      : field(ageFromRel.label, "medium", "Age from structured eligibility");

  const summary = [
    phase.value ? `Phase ${phase.value}` : null,
    indication,
    enrollmentTarget.value ? `n≈${enrollmentTarget.value}` : null,
    geography.value.length ? geography.value.slice(0, 3).join("/") : "US",
    requireSpanish ? "Spanish" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    rawText: text,
    disease: field(disease, indConf, indEvidence || "Disease label"),
    indication: field(indication, indConf, indEvidence || "Indication label"),
    phase,
    enrollmentTarget,
    geography,
    inclusion,
    exclusion,
    biomarkers: biomarkersField,
    visitBurden,
    ageRange: ageFieldResolved,
    diversityGoals,
    requireSpanish,
    requireDct,
    keywords: keywords.length
      ? keywords
      : indication
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w: string) => w.length > 3)
          .slice(0, 8),
    eligibilityRelations,
    restrictiveness,
    summary,
  };
}

export function parsedToDraft(parsed: ParsedProtocol): ProtocolDraft {
  return {
    id: `p-${Date.now()}`,
    name: parsed.indication.value || parsed.disease.value || "Untitled protocol",
    disease: parsed.disease.value,
    indication: parsed.indication.value,
    inclusion: parsed.inclusion.value || "See protocol text",
    exclusion: parsed.exclusion.value || "See protocol text",
    geography: parsed.geography.value,
    visitBurden: parsed.visitBurden.value,
    biomarkers: parsed.biomarkers.value,
    phase: parsed.phase.value,
    enrollmentTarget: parsed.enrollmentTarget.value,
    diversityGoals: parsed.diversityGoals.value,
    requireSpanish: parsed.requireSpanish,
    requireDct: parsed.requireDct,
    rawText: parsed.rawText,
    restrictiveness: parsed.restrictiveness,
  };
}
