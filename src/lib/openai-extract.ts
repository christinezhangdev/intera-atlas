import OpenAI from "openai";
import {
  estimateRestrictivenessFromRelations,
  extractLocalRelations,
  mergeRelations,
  normalizeLlmRelations,
  splitEligibilitySections,
} from "@/lib/eligibility";
import type { ParsedField, ParsedProtocol } from "@/lib/protocol-parser";
import { parseProtocol } from "@/lib/protocol-parser";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

export function extractorModel() {
  return process.env.EXTRACTOR_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";
}

export function embeddingModel() {
  return process.env.EMBEDDING_MODEL || "text-embedding-3-small";
}

type LlmField = {
  value: string | number | string[] | boolean | null;
  confidence: "high" | "medium" | "low";
  evidence: string;
};

type LlmExtraction = {
  disease: LlmField;
  indication: LlmField;
  phase: LlmField;
  enrollmentTarget: LlmField;
  geography: LlmField;
  inclusion: LlmField;
  exclusion: LlmField;
  biomarkers: LlmField;
  visitBurden: LlmField;
  ageRange: LlmField;
  diversityGoals: LlmField;
  requireSpanish: boolean;
  requireDct: boolean;
  keywords: string[];
  summary: string;
  eligibilityRelations?: unknown;
};

function asField<T extends string | number | string[]>(
  f: LlmField | undefined,
  fallback: T,
): ParsedField<T> {
  if (!f || f.value == null || f.value === "") {
    return {
      value: fallback,
      confidence: "low",
      evidence: "Not extracted",
    };
  }
  return {
    value: f.value as T,
    confidence: f.confidence || "medium",
    evidence: f.evidence || "LLM extraction",
  };
}

const SYSTEM = `You extract structured clinical-trial protocol requirements for site selection.
Return ONLY valid JSON matching the schema. Be precise; cite short evidence snippets from the protocol text.
If a field is missing, use empty string / empty array / null and confidence "low".
Geography should be US state full names when possible (e.g. "Texas"), or empty array for nationwide US.
Phase should be "1","2","3", or "4".
Keywords: 4-10 lowercase therapeutic tokens useful for matching research sites.
Do not invent patients enrollment counts — only extract if stated; otherwise null.

Also extract eligibilityRelations using Meta Clinical-Trial-Parser style:
- variableType "numerical" for age, BMI, labs (lower/upper bounds with incl booleans, unit)
- variableType "ordinal" for ECOG/NYHA-like scores (value as eligible score strings)
- variableType "nominal" for pregnancy, allergy, cancer subtype, treatment, language, biomarkers (value like ["yes"]/["no"] or concept tokens)
- section "inclusion" or "exclusion"
- label: short chip text (e.g. "Age 18–75", "BMI ≥ 30", "ECOG 0–1", "EGFR+")
- score: 0–1 confidence
Prefer extracting from Inclusion/Exclusion sections when present.`;

const SCHEMA_HINT = `{
  "disease": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "indication": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "phase": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "enrollmentTarget": { "value": number|null, "confidence": "high"|"medium"|"low", "evidence": string },
  "geography": { "value": string[], "confidence": "high"|"medium"|"low", "evidence": string },
  "inclusion": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "exclusion": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "biomarkers": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "visitBurden": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "ageRange": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "diversityGoals": { "value": string, "confidence": "high"|"medium"|"low", "evidence": string },
  "requireSpanish": boolean,
  "requireDct": boolean,
  "keywords": string[],
  "summary": string,
  "eligibilityRelations": [{
    "name": string,
    "variableType": "nominal"|"ordinal"|"numerical",
    "value": string[]|null,
    "lower": { "value": number, "incl": boolean }|null,
    "upper": { "value": number, "incl": boolean }|null,
    "unit": string|null,
    "score": number,
    "section": "inclusion"|"exclusion",
    "label": string
  }]
}`;

export async function extractProtocolWithLLM(rawText: string): Promise<ParsedProtocol> {
  const fallback = parseProtocol(rawText);
  if (!process.env.OPENAI_API_KEY) return fallback;

  const sections = splitEligibilitySections(rawText);
  const localRelations = extractLocalRelations(rawText, sections);

  const openai = getOpenAI();
  const model = extractorModel();

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Schema:\n${SCHEMA_HINT}\n\nInclusion section (pre-split):\n"""${sections.inclusion.slice(0, 8000)}"""\n\nExclusion section (pre-split):\n"""${sections.exclusion.slice(0, 8000)}"""\n\nFull protocol text:\n"""${rawText.slice(0, 20000)}"""`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return fallback;

  let data: LlmExtraction;
  try {
    data = JSON.parse(content) as LlmExtraction;
  } catch {
    return fallback;
  }

  const geographyValues = Array.isArray(data.geography?.value)
    ? (data.geography.value as string[])
    : typeof data.geography?.value === "string" && data.geography.value
      ? [String(data.geography.value)]
      : [];

  const enrollRaw = data.enrollmentTarget?.value;
  const enrollNum =
    typeof enrollRaw === "number"
      ? enrollRaw
      : typeof enrollRaw === "string"
        ? Number(String(enrollRaw).replace(/,/g, ""))
        : NaN;

  const disease = asField(data.disease, fallback.disease.value);
  const indication = asField(data.indication, fallback.indication.value || disease.value);
  const phase = asField(data.phase, fallback.phase.value || "3");
  const enrollmentTarget: ParsedField<number> = Number.isFinite(enrollNum)
    ? {
        value: enrollNum,
        confidence: data.enrollmentTarget?.confidence || "high",
        evidence: data.enrollmentTarget?.evidence || "LLM extraction",
      }
    : fallback.enrollmentTarget;

  const geography: ParsedField<string[]> = {
    value: geographyValues.length ? geographyValues : fallback.geography.value,
    confidence: data.geography?.confidence || (geographyValues.length ? "high" : "low"),
    evidence: data.geography?.evidence || fallback.geography.evidence,
  };

  const eligibilityRelations = mergeRelations(
    normalizeLlmRelations(data.eligibilityRelations),
    localRelations.length ? localRelations : fallback.eligibilityRelations,
  );

  const requireSpanish =
    Boolean(data.requireSpanish) ||
    fallback.requireSpanish ||
    eligibilityRelations.some(
      (r) => r.name === "language" && r.value?.some((v) => /spanish/i.test(v)),
    );
  const requireDct = Boolean(data.requireDct) || fallback.requireDct;
  const keywords =
    Array.isArray(data.keywords) && data.keywords.length
      ? data.keywords.map(String)
      : fallback.keywords;

  const ageFromRel = eligibilityRelations.find((r) => r.name === "age");
  const ageRange = asField(data.ageRange, fallback.ageRange.value);
  if (!ageRange.value && ageFromRel) {
    ageRange.value = ageFromRel.label;
    ageRange.confidence = "medium";
    ageRange.evidence = "From structured eligibility relation";
  }

  const inclusion = asField(
    data.inclusion,
    sections.inclusion.slice(0, 900) || fallback.inclusion.value,
  );
  const exclusion = asField(
    data.exclusion,
    sections.exclusion.slice(0, 900) || fallback.exclusion.value,
  );

  const summary =
    data.summary?.trim() ||
    [
      phase.value ? `Phase ${phase.value}` : null,
      indication.value,
      enrollmentTarget.value ? `n≈${enrollmentTarget.value}` : null,
      geography.value.length ? geography.value.slice(0, 3).join("/") : "US",
      requireSpanish ? "Spanish" : null,
      eligibilityRelations.length ? `${eligibilityRelations.length} criteria` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return {
    rawText,
    disease,
    indication,
    phase,
    enrollmentTarget,
    geography,
    inclusion,
    exclusion,
    biomarkers: asField(data.biomarkers, fallback.biomarkers.value),
    visitBurden: asField(data.visitBurden, fallback.visitBurden.value),
    ageRange,
    diversityGoals: asField(data.diversityGoals, fallback.diversityGoals.value),
    requireSpanish,
    requireDct,
    keywords,
    eligibilityRelations,
    restrictiveness: estimateRestrictivenessFromRelations(eligibilityRelations, rawText),
    summary,
  };
}
