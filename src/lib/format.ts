import type { QualityBand } from "@/lib/types";

/** Soft chips — no solid black/dark fills that read as placeholders */
export function scoreBandClass(band: QualityBand | string): string {
  switch (band) {
    case "elite":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200";
    case "strong":
      return "bg-emerald-50/80 text-emerald-700 ring-1 ring-inset ring-emerald-100";
    case "mid":
      return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
    case "thin":
      return "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200";
    default:
      return "bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-100";
  }
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return scoreBandClass("unscored");
  if (score >= 80) return scoreBandClass("elite");
  if (score >= 60) return scoreBandClass("strong");
  if (score >= 40) return scoreBandClass("mid");
  return scoreBandClass("thin");
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}
