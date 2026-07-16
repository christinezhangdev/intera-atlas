import { NextResponse } from "next/server";
import { extractTextFromUpload } from "@/lib/extract-upload";
import { extractProtocolWithLLM } from "@/lib/openai-extract";
import { parseProtocol } from "@/lib/protocol-parser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 400 });
    }

    const text = await extractTextFromUpload(buf, file.name, file.type || "");
    if (!text || text.length < 40) {
      return NextResponse.json(
        { error: "Could not extract enough text from that file." },
        { status: 422 },
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
        console.error("LLM extract after upload failed:", err);
        parsed = parseProtocol(text);
      }
    } else {
      parsed = parseProtocol(text);
    }

    return NextResponse.json({
      filename: file.name,
      text: text.slice(0, 50000),
      parsed,
      engine,
      model,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
