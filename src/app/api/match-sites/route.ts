import { NextResponse } from "next/server";
import { generateAiRationales } from "@/lib/ai-rationale";
import { embeddingModel, getOpenAI } from "@/lib/openai-extract";
import { matchTrialSites, type TrialSiteMatch } from "@/lib/match-engine";
import { siteSeekingBoost } from "@/lib/match-sponsors";
import { claimsByLinkedSiteId } from "@/lib/org-store";
import type { ParsedProtocol } from "@/lib/protocol-parser";
import { getAllSites } from "@/lib/sites";

export const runtime = "nodejs";

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      parsed?: ParsedProtocol;
      limit?: number;
      withAiRationale?: boolean;
    };
    if (!body.parsed) {
      return NextResponse.json({ error: "parsed protocol required" }, { status: 400 });
    }

    const sites = getAllSites();
    const seekingBySite = await claimsByLinkedSiteId();
    const base = matchTrialSites(sites, body.parsed, body.limit ?? 30);
    let matches: TrialSiteMatch[] = base.matches.map((m) => {
      const { boost, detail } = siteSeekingBoost(
        seekingBySite.get(m.site.id),
        body.parsed!.indication.value,
        body.parsed!.keywords,
      );
      if (!boost) return m;
      return {
        ...m,
        matchScore: Math.round((m.matchScore + boost * 100) * 10) / 10,
        rationale: [
          {
            kind: "fit" as const,
            title: "Actively seeking (claimed)",
            detail: detail || "Site private seeking overlaps this protocol.",
          },
          ...m.rationale,
        ],
      };
    });
    matches.sort((a, b) => b.matchScore - a.matchScore);
    matches = matches.map((m, i) => ({ ...m, rank: i + 1 }));
    let engine = "model-v2+claims";
    let embModel: string | null = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = getOpenAI();
        const model = embeddingModel();
        const query = [
          body.parsed.indication.value,
          body.parsed.disease.value,
          body.parsed.keywords.join(" "),
          body.parsed.inclusion.value.slice(0, 400),
        ]
          .filter(Boolean)
          .join(" | ");

        const top = matches.slice(0, 20);
        const docs = top.map(
          (m) =>
            `${m.site.name}. ${m.site.therapeuticAreas}. ${m.site.therapeuticSpecialties}. ${m.site.notes.slice(0, 280)}`,
        );

        const emb = await openai.embeddings.create({
          model,
          input: [query, ...docs],
        });
        const qVec = emb.data[0]?.embedding;
        if (qVec) {
          const boosted = top.map((m, i) => {
            const sim = cosine(qVec, emb.data[i + 1]?.embedding || []);
            const matchScore = Math.round((m.matchScore * 0.75 + sim * 100 * 0.25) * 10) / 10;
            return {
              ...m,
              matchScore,
              rationale: [
                {
                  kind: "fit" as const,
                  title: "Embedding similarity",
                  detail: `Semantic similarity to protocol ${sim.toFixed(3)} (${model}).`,
                },
                ...m.rationale,
              ],
            };
          });
          boosted.sort((a, b) => b.matchScore - a.matchScore);
          const rest = matches.slice(20);
          matches = [...boosted, ...rest].map((m, i) => ({ ...m, rank: i + 1 }));
          engine = "model-v2+embeddings";
          embModel = model;
        }
      } catch (err) {
        console.error("Embedding re-rank failed:", err);
      }

      if (body.withAiRationale !== false) {
        try {
          const ai = await generateAiRationales(body.parsed, matches, 8);
          const byId = new Map(ai.map((r) => [r.siteId, r]));
          matches = matches.map((m) => {
            const r = byId.get(m.site.id);
            if (!r) return m;
            return {
              ...m,
              aiNarrative: r.narrative,
              aiStrengths: r.strengths,
              aiRisks: r.risks,
              aiInteraAngle: r.interaAngle,
              headline: m.headline,
            };
          });
          engine = `${engine}+ai-rationale`;
        } catch (err) {
          console.error("AI rationale failed:", err);
        }
      }
    }

    return NextResponse.json({
      ...base,
      matches,
      engine,
      embeddingModel: embModel,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Match failed" }, { status: 500 });
  }
}
