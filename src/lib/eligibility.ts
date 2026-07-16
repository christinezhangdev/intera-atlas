/**
 * Eligibility relations inspired by Meta Clinical-Trial-Parser
 * (nominal / ordinal / numerical machine-readable criteria).
 * @see https://github.com/facebookresearch/Clinical-Trial-Parser
 */

export type EligibilitySection = "inclusion" | "exclusion" | "unknown";

export type NumericalBound = {
  value: number;
  incl: boolean;
};

export type EligibilityRelation = {
  name: string;
  variableType: "nominal" | "ordinal" | "numerical";
  /** Eligible values for nominal/ordinal (e.g. ["yes"], ["0","1"]) */
  value?: string[];
  lower?: NumericalBound;
  upper?: NumericalBound;
  unit?: string;
  /** 0–1 confidence */
  score: number;
  section: EligibilitySection;
  /** short human label for UI chips */
  label: string;
};

export type EligibilitySections = {
  inclusion: string;
  exclusion: string;
  remainder: string;
};

const INCLUSION_HEADER =
  /(?:^|\n)\s*(?:#+\s*)?(?:inclusion\s+criteria|inclusion\s+criterion|key\s+inclusion|inclusion)\s*[:\-–]?\s*/i;
const EXCLUSION_HEADER =
  /(?:^|\n)\s*(?:#+\s*)?(?:exclusion\s+criteria|exclusion\s+criterion|key\s+exclusion|exclusion)\s*[:\-–]?\s*/i;

/**
 * Split protocol text into inclusion / exclusion blocks (CTP-style preprocessing).
 */
export function splitEligibilitySections(text: string): EligibilitySections {
  const raw = text.trim();
  if (!raw) return { inclusion: "", exclusion: "", remainder: "" };

  const inclMatch = INCLUSION_HEADER.exec(raw);
  const exclMatch = EXCLUSION_HEADER.exec(raw);

  if (!inclMatch && !exclMatch) {
    return { inclusion: "", exclusion: "", remainder: raw };
  }

  const points: { kind: "inclusion" | "exclusion"; index: number; len: number }[] = [];
  if (inclMatch) {
    points.push({ kind: "inclusion", index: inclMatch.index, len: inclMatch[0].length });
  }
  if (exclMatch) {
    points.push({ kind: "exclusion", index: exclMatch.index, len: exclMatch[0].length });
  }
  points.sort((a, b) => a.index - b.index);

  let inclusion = "";
  let exclusion = "";
  const remainder = raw.slice(0, points[0].index).trim();

  for (let i = 0; i < points.length; i++) {
    const start = points[i].index + points[i].len;
    const end = i + 1 < points.length ? points[i + 1].index : raw.length;
    const body = raw.slice(start, end).trim();
    if (points[i].kind === "inclusion") inclusion = body;
    else exclusion = body;
  }

  return { inclusion, exclusion, remainder };
}

function numBound(value: number, incl: boolean): NumericalBound {
  return { value, incl };
}

function parseNumber(s: string): number | null {
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Local CFG-like heuristics for common numerical / ordinal eligibility vars.
 */
export function extractLocalRelations(
  text: string,
  sections?: EligibilitySections,
): EligibilityRelation[] {
  const relations: EligibilityRelation[] = [];
  const sec = sections ?? splitEligibilitySections(text);
  const bags: { section: EligibilitySection; body: string }[] = [
    { section: "inclusion", body: sec.inclusion || text },
    { section: "exclusion", body: sec.exclusion },
  ];

  for (const { section, body } of bags) {
    if (!body) continue;
    const t = body;

    const ageRange = t.match(
      /(?:aged?|ages?|age)\s*(?:of\s*)?(\d{1,3})\s*(?:to|[-–]|through)\s*(\d{1,3})(?:\s*years?)?/i,
    );
    if (ageRange) {
      const lo = parseNumber(ageRange[1]);
      const hi = parseNumber(ageRange[2]);
      if (lo != null && hi != null) {
        relations.push({
          name: "age",
          variableType: "numerical",
          lower: numBound(lo, true),
          upper: numBound(hi, true),
          unit: "years",
          score: 0.9,
          section,
          label: `Age ${lo}–${hi}`,
        });
      }
    } else {
      const ageMin = t.match(/(?:aged?|age)\s*(?:≥|>=|at\s+least)\s*(\d{1,3})/i);
      const ageMax = t.match(/(?:aged?|age)\s*(?:≤|<=|under|below)\s*(\d{1,3})/i);
      if (ageMin || ageMax) {
        const lo = ageMin ? parseNumber(ageMin[1]) : null;
        const hi = ageMax ? parseNumber(ageMax[1]) : null;
        relations.push({
          name: "age",
          variableType: "numerical",
          lower: lo != null ? numBound(lo, true) : undefined,
          upper: hi != null ? numBound(hi, true) : undefined,
          unit: "years",
          score: 0.85,
          section,
          label:
            lo != null && hi != null
              ? `Age ${lo}–${hi}`
              : lo != null
                ? `Age ≥ ${lo}`
                : `Age ≤ ${hi}`,
        });
      }
    }

    const bmiRange = t.match(
      /bmi\s*(?:of\s*)?(?:≥|>=|at\s+least)?\s*([\d.]+)\s*(?:to|[-–]|and\s*<|<)\s*([\d.]+)/i,
    );
    if (bmiRange) {
      const lo = parseNumber(bmiRange[1]);
      const hi = parseNumber(bmiRange[2]);
      if (lo != null && hi != null) {
        relations.push({
          name: "bmi",
          variableType: "numerical",
          lower: numBound(lo, true),
          upper: numBound(hi, false),
          unit: "kg/m2",
          score: 0.88,
          section,
          label: `BMI ${lo}–${hi}`,
        });
      }
    } else {
      const bmiMin = t.match(/bmi\s*(?:of\s*)?(?:≥|>=|at\s+least)\s*([\d.]+)/i);
      if (bmiMin) {
        const lo = parseNumber(bmiMin[1]);
        if (lo != null) {
          relations.push({
            name: "bmi",
            variableType: "numerical",
            lower: numBound(lo, true),
            unit: "kg/m2",
            score: 0.85,
            section,
            label: `BMI ≥ ${lo}`,
          });
        }
      }
    }

    const ecogOr = t.match(
      /ecog(?:\s+performance\s+status)?\s*(?:of\s*)?([0-4])\s*(?:or|,|\/)\s*([0-4])(?:\s*(?:or|,|\/)\s*([0-4]))?/i,
    );
    if (ecogOr) {
      const vals = [ecogOr[1], ecogOr[2], ecogOr[3]].filter(Boolean) as string[];
      relations.push({
        name: "ecog",
        variableType: "ordinal",
        value: vals,
        score: 0.9,
        section,
        label: `ECOG ${vals.join(",")}`,
      });
    } else {
      const ecog = t.match(
        /ecog(?:\s+performance\s+status)?\s*(?:of\s*)?([0-4](?:\s*,\s*[0-4])+)/i,
      );
      if (ecog) {
        const vals = ecog[1].split(/\s*,\s*/).map((v) => v.trim());
        relations.push({
          name: "ecog",
          variableType: "ordinal",
          value: vals,
          score: 0.9,
          section,
          label: `ECOG ${vals.join(",")}`,
        });
      } else {
        const ecogRange = t.match(
          /ecog(?:\s+performance\s+status)?\s*(?:of\s*)?(?:≤|<=|0\s*[-–]\s*)\s*([0-2])/i,
        );
        if (ecogRange) {
          const hi = Number(ecogRange[1]);
          const vals = Array.from({ length: hi + 1 }, (_, i) => String(i));
          relations.push({
            name: "ecog",
            variableType: "ordinal",
            value: vals,
            score: 0.88,
            section,
            label: `ECOG 0–${hi}`,
          });
        }
      }
    }

    const hba1c = t.match(/hba1c\s*(?:of\s*)?([\d.]+)\s*(?:to|[-–]|and)\s*([\d.]+)\s*%?/i);
    if (hba1c) {
      const lo = parseNumber(hba1c[1]);
      const hi = parseNumber(hba1c[2]);
      if (lo != null && hi != null) {
        relations.push({
          name: "hba1c",
          variableType: "numerical",
          lower: numBound(lo, true),
          upper: numBound(hi, true),
          unit: "%",
          score: 0.85,
          section,
          label: `HbA1c ${lo}–${hi}%`,
        });
      }
    }

    if (/\bpregnan/i.test(t)) {
      const excludePreg =
        section === "exclusion" ||
        /\bnot\s+pregnan|non[- ]?pregnan|must\s+not\s+be\s+pregnan/i.test(t);
      relations.push({
        name: "pregnancy",
        variableType: "nominal",
        value: [excludePreg ? "no" : "yes"],
        score: 0.8,
        section,
        label: excludePreg ? "Not pregnant" : "Pregnancy required",
      });
    }

    if (/\bspanish[- ]speaking|\bfluent\s+in\s+spanish|\bspanish\b/i.test(t)) {
      relations.push({
        name: "language",
        variableType: "nominal",
        value: ["spanish"],
        score: 0.85,
        section,
        label: "Spanish language",
      });
    }
  }

  const biomarkerHints = text.match(
    /\b(EGFR|HER2|PD-L1|KRAS|BRAF|ALK|ROS1|BRCA[12]?|MSI[- ]?H|TMB|FeNO)\b/gi,
  );
  if (biomarkerHints) {
    const uniq = [...new Set(biomarkerHints.map((b) => b.toUpperCase()))].slice(0, 6);
    for (const b of uniq) {
      relations.push({
        name: "biomarker",
        variableType: "nominal",
        value: [b],
        score: 0.75,
        section: "inclusion",
        label: b,
      });
    }
  }

  return dedupeRelations(relations);
}

function dedupeRelations(relations: EligibilityRelation[]): EligibilityRelation[] {
  const seen = new Set<string>();
  const out: EligibilityRelation[] = [];
  for (const r of relations) {
    const key = `${r.name}|${r.variableType}|${r.section}|${r.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Restrictiveness from structured relations (CTP-inspired) + text cues.
 * Lower = harder to recruit.
 */
export function estimateRestrictivenessFromRelations(
  relations: EligibilityRelation[],
  rawText: string,
): number {
  let penalty = 0;
  const t = rawText.toLowerCase();

  penalty += Math.min(0.28, relations.length * 0.025);

  for (const r of relations) {
    if (r.variableType === "numerical") {
      if (r.lower && r.upper) {
        const span = r.upper.value - r.lower.value;
        if (r.name === "age" && span < 30) penalty += 0.04;
        if (r.name === "bmi" && span < 8) penalty += 0.05;
        if (r.name === "hba1c") penalty += 0.04;
      } else if (r.lower || r.upper) {
        penalty += 0.03;
      }
    }
    if (r.name === "biomarker") penalty += 0.045;
    if (r.name === "ecog" && (r.value?.length ?? 0) <= 2) penalty += 0.03;
    if (r.section === "exclusion") penalty += 0.015;
  }

  const strict = [
    "biomarker",
    "mutation",
    "prior therapy",
    "washout",
    "metastatic",
    "screen fail",
    "contraindication",
  ];
  for (const s of strict) if (t.includes(s)) penalty += 0.03;

  return Math.max(0.42, Math.min(1, 1 - penalty));
}

export function relationsForRationale(relations: EligibilityRelation[], limit = 5): string[] {
  return relations
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.label);
}

export function normalizeLlmRelations(raw: unknown): EligibilityRelation[] {
  if (!Array.isArray(raw)) return [];
  const out: EligibilityRelation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name || "").trim().toLowerCase();
    const variableType = o.variableType as EligibilityRelation["variableType"];
    if (!name || !["nominal", "ordinal", "numerical"].includes(variableType)) continue;

    const sectionRaw = String(o.section || "unknown").toLowerCase();
    const section: EligibilitySection =
      sectionRaw === "inclusion" || sectionRaw === "exclusion" ? sectionRaw : "unknown";

    const lower =
      o.lower && typeof o.lower === "object"
        ? {
            value: Number((o.lower as NumericalBound).value),
            incl: Boolean((o.lower as NumericalBound).incl ?? true),
          }
        : undefined;
    const upper =
      o.upper && typeof o.upper === "object"
        ? {
            value: Number((o.upper as NumericalBound).value),
            incl: Boolean((o.upper as NumericalBound).incl ?? true),
          }
        : undefined;

    const value = Array.isArray(o.value) ? o.value.map(String) : undefined;
    const unit = o.unit ? String(o.unit) : undefined;
    const score = Math.max(0, Math.min(1, Number(o.score ?? 0.7)));
    const label =
      String(o.label || "").trim() ||
      buildLabel(name, variableType, value, lower, upper, unit);

    out.push({
      name,
      variableType,
      value,
      lower: lower && Number.isFinite(lower.value) ? lower : undefined,
      upper: upper && Number.isFinite(upper.value) ? upper : undefined,
      unit,
      score,
      section,
      label,
    });
  }
  return dedupeRelations(out);
}

function buildLabel(
  name: string,
  type: EligibilityRelation["variableType"],
  value?: string[],
  lower?: NumericalBound,
  upper?: NumericalBound,
  unit?: string,
): string {
  if (type === "numerical") {
    const u = unit ? ` ${unit}` : "";
    if (lower && upper) return `${name} ${lower.value}–${upper.value}${u}`.trim();
    if (lower) return `${name} ≥ ${lower.value}${u}`.trim();
    if (upper) return `${name} ≤ ${upper.value}${u}`.trim();
  }
  if (value?.length) return `${name}: ${value.join(", ")}`;
  return name;
}

export function mergeRelations(
  primary: EligibilityRelation[],
  fallback: EligibilityRelation[],
): EligibilityRelation[] {
  if (!primary.length) return fallback;
  const names = new Set(primary.map((r) => r.name));
  const extras = fallback.filter((r) => !names.has(r.name));
  return dedupeRelations([...primary, ...extras]);
}
