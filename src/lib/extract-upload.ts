import mammoth from "mammoth";
import { getPath } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

let workerReady = false;

function ensurePdfWorker() {
  if (workerReady) return;
  PDFParse.setWorker(getPath());
  workerReady = true;
}

export async function extractTextFromUpload(
  buffer: Buffer,
  filename: string,
  mime: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  const isPdf = mime.includes("pdf") || lower.endsWith(".pdf");
  const isDocx =
    mime.includes("wordprocessingml") ||
    mime.includes("msword") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc");
  const isText =
    mime.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv");

  if (isPdf) {
    ensurePdfWorker();
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text || "").trim();
    } finally {
      await parser.destroy?.();
    }
  }

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }

  if (isText || !mime || mime === "application/octet-stream") {
    return buffer.toString("utf8").trim();
  }

  const asText = buffer.toString("utf8").trim();
  if (asText.length > 40) return asText;
  throw new Error(`Unsupported file type: ${mime || filename}. Upload PDF, DOCX, or TXT.`);
}
