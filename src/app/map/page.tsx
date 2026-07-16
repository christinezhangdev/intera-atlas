import Link from "next/link";
import { ScoreChip } from "@/components/ScoreChip";
import { getAllSites } from "@/lib/sites";

/** Dense state coverage table — map plane without decorative GIS for MVP */
export default function MapPage() {
  const sites = getAllSites().filter((s) => s.scorable);

  const byState = new Map<string, typeof sites>();
  for (const s of sites) {
    for (const st of s.statesList) {
      // skip multi-word noise like "Multi-state..."
      if (st.length > 24 || /multi-state|nationwide|50 states/i.test(st)) continue;
      const key = st.replace(/\s*\(.*\)\s*/g, "").trim();
      if (!key) continue;
      if (!byState.has(key)) byState.set(key, []);
      byState.get(key)!.push(s);
    }
  }

  const rows = [...byState.entries()]
    .map(([state, list]) => {
      const uniq = [...new Map(list.map((s) => [s.id, s])).values()];
      const avgOverall =
        uniq.reduce((a, s) => a + (s.scores.overallSiteQuality ?? 0), 0) /
        Math.max(1, uniq.filter((s) => s.scores.overallSiteQuality != null).length);
      const top = [...uniq].sort(
        (a, b) => (b.scores.overallSiteQuality ?? 0) - (a.scores.overallSiteQuality ?? 0),
      )[0];
      return { state, count: uniq.length, avgOverall: Math.round(avgOverall), top };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-[18px] font-semibold tracking-tight">Maps</h1>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        Spatial decision plane as coverage table for MVP — same filter language as Explorer. FUTURE:
        geocoded point map + RWD choropleth.
      </p>

      <div className="mt-5 overflow-hidden rounded border border-[var(--line)]">
        <table className="w-full text-left text-[12px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel)] text-[10px] uppercase text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">State / region</th>
              <th className="px-2 py-2">Sites</th>
              <th className="px-2 py-2">Avg Overall</th>
              <th className="px-2 py-2">Top site</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.state} className="border-b border-[var(--line)] hover:bg-[var(--hover)]">
                <td className="px-3 py-2 font-medium">{r.state}</td>
                <td className="px-2 py-2 font-mono tabular">{r.count}</td>
                <td className="px-2 py-2">
                  <ScoreChip value={r.avgOverall || null} compact />
                </td>
                <td className="px-2 py-2">
                  {r.top ? (
                    <Link href={`/sites/${r.top.id}`} className="underline">
                      {r.top.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
