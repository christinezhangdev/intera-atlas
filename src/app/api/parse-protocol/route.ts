import { NextResponse } from "next/server";
import { extractProtocolWithLLM } from "@/lib/openai-extract";
import { parseProtocol } from "@/lib/protocol-parser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string };
    const text = (body.text || "").trim();
    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: "Protocol text is required (min ~20 chars)." },
        { status: 400 },
      );
    }

    let parsed;
    let engine: "llm" | "heuristic" = "heuristic";
    let model: string | null = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        parsed = await extractProtocolWithLLM(text);
        engine = "llm";
        model = process.env.EXTRACTOR_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";
      } catch (err) {
        console.error("LLM extract failed, falling back:", err);
        parsed = parseProtocol(text);
        engine = "heuristic";
      }
    } else {
      parsed = parseProtocol(text);
    }

    return NextResponse.json({ parsed, engine, model });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to parse protocol" }, { status: 500 });
  }
}
