import { getOpenAI, extractorModel } from "@/lib/openai-extract";
import type { ParsedProtocol } from "@/lib/protocol-parser";
import type { TrialSiteMatch } from "@/lib/match-engine";
import {
  dataQualityFlags,
  hasPrimaryIndicationAlignment,
} from "@/lib/sites";

export type AiRationale = {
  siteId: string;
  narrative: string;
  strengths: string[];
  risks: string[];
  interaAngle: string;
};

export async function generateAiRationales(
  parsed: ParsedProtocol,
  matches: TrialSiteMatch[],
  limit = 8,
): Promise<AiRationale[]> {
  if (!process.env.OPENAI_API_KEY || matches.length === 0) return [];

  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL || extractorModel();
  const top = matches.slice(0, limit);
  const indication = `${parsed.indication.value} ${parsed.summary || ""}`;

  const payload = {
    protocol: {
      summary: parsed.summary,
      indication: parsed.indication.value,
      phase: parsed.phase.value,
      geography: parsed.geography.value,
      enrollmentTarget: parsed.enrollmentTarget.value,
      biomarkers: parsed.biomarkers.value,
      requireSpanish: parsed.requireSpanish,
      keywords: parsed.keywords,
      restrictiveness: parsed.restrictiveness,
      eligibilityRelations: (parsed.eligibilityRelations || []).slice(0, 12).map((r) => ({
        name: r.name,
        type: r.variableType,
        label: r.label,
        section: r.section,
      })),
    },
    sites: top.map((m) => {
      const primaryAligned = hasPrimaryIndicationAlignment(m.site, indication);
      return {
        id: m.site.id,
        name: m.site.name,
        hq: m.site.hq,
        type: m.site.type,
        matchScore: m.matchScore,
        accrualIndex: m.accrualIndex,
        indFit: m.indFit,
        primaryTherapeuticAlignment: primaryAligned,
        liftability: m.liftability,
        headline: m.headline,
        scores: m.scores,
        histTrials: m.site.histTrials,
        completionRate: m.site.completionRate,
        activeNow: m.site.activeNow,
        therapeuticAreas: m.site.therapeuticAreas.slice(0, 220),
        therapeuticSpecialties: m.site.therapeuticSpecialties.slice(0, 160),
        dataQualityFlags: dataQualityFlags(m.site),
        recruitSophistication: m.site.recruitSophistication,
        spanish: m.site.spanish,
        algorithmPoints: m.rationale.map((r) => `${r.title}: ${r.detail}`),
      };
    }),
  };

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write concise site-selection rationales for clinical trial sponsors.
Return JSON: { "rationales": [{ "siteId": string, "narrative": string (2-4 sentences), "strengths": string[2-4], "risks": string[1-3], "interaAngle": string (1 sentence on Intera recruitment lift) }] }

GROUNDING RULES (mandatory):
- Only claim therapeutic / indication alignment when primaryTherapeuticAlignment is true AND indFit >= 0.45 AND therapeuticAreas clearly support the protocol indication.
- If primaryTherapeuticAlignment is false, you MUST say the site is "adjacent/backup — verify indication depth". Do not invent an "oncology signal", "therapeutic alignment", or similar when areas are cardiac, metabolic, or otherwise off-indication.
- Never treat Therapeutic Expertise score (or Overall Site Quality) as proof of indication fit — those are general scorecard metrics.
- If dataQualityFlags includes "Over-broad match (capped) — verify", flag volume/footprint as unreliable; do not cite capped trial counts as deep indication experience.
- Ground every claim in the provided fields. Do not invent enrollment rates, sponsors, biomarkers, or capabilities not in the data.
- Be direct and professional — Bloomberg/Linear tone, not marketing fluff.`,
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [];
  try {
    const parsedJson = JSON.parse(content) as { rationales?: AiRationale[] };
    const list = parsedJson.rationales || [];
    return list.filter((r) => r.siteId && r.narrative);
  } catch {
    return [];
  }
}
