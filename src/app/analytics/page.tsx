import { getAllSites, getMeta } from "@/lib/sites";

export default function AnalyticsPage() {
  const meta = getMeta();
  const sites = getAllSites();

  const bands = { elite: 0, strong: 0, mid: 0, thin: 0, unscored: 0 };
  for (const s of sites) {
    bands[s.scores.band] += 1;
  }

  const types = new Map<string, number>();
  for (const s of sites) types.set(s.type, (types.get(s.type) || 0) + 1);
  const typeRows = [...types.entries()].sort((a, b) => b[1] - a[1]);

  const icp = Array.from({ length: 10 }, (_, i) => ({
    score: i,
    n: sites.filter((s) => s.icpScore === i).length,
  }));

  const highLift = sites.filter(
    (s) => s.scorable && s.recruitSophistication <= 0.2 && (s.scores.therapeuticExpertise ?? 0) >= 70,
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-[18px] font-semibold tracking-tight">Analytics</h1>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        One-question modules on the public Site Graph. Not a BI wall.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Sites" value={meta.total} />
        <Stat label="Scored" value={meta.scored} />
        <Stat label="Unscored" value={meta.unscored} />
        <Stat label="High-lift proxies" value={highLift} />
      </div>

      <h2 className="mb-2 mt-8 text-[13px] font-semibold">Overall Site Quality distribution</h2>
      <div className="overflow-hidden rounded border border-[var(--line)]">
        <table className="w-full text-left text-[12px]">
          <tbody>
            {(
              [
                ["elite", "80–100", bands.elite],
                ["strong", "60–79", bands.strong],
                ["mid", "40–59", bands.mid],
                ["thin", "1–39", bands.thin],
                ["unscored", "—", bands.unscored],
              ] as const
            ).map(([band, range, n]) => (
              <tr key={band} className="border-b border-[var(--line)]">
                <td className="px-3 py-2 capitalize">{band}</td>
                <td className="px-2 py-2 text-[var(--muted)]">{range}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 rounded bg-[var(--accent)]/80"
                      style={{ width: `${Math.max(4, (n / meta.total) * 220)}px` }}
                    />
                    <span className="font-mono tabular">{n}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-[13px] font-semibold">Org types</h2>
          <div className="overflow-hidden rounded border border-[var(--line)]">
            <table className="w-full text-left text-[12px]">
              <tbody>
                {typeRows.map(([t, n]) => (
                  <tr key={t} className="border-b border-[var(--line)]">
                    <td className="px-3 py-1.5">{t}</td>
                    <td className="px-2 py-1.5 font-mono tabular">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-[13px] font-semibold">Intera ICP Score</h2>
          <div className="overflow-hidden rounded border border-[var(--line)]">
            <table className="w-full text-left text-[12px]">
              <tbody>
                {icp.map((row) => (
                  <tr key={row.score} className="border-b border-[var(--line)]">
                    <td className="px-3 py-1.5 font-mono">{row.score}</td>
                    <td className="px-2 py-1.5 font-mono tabular">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[var(--muted)]">
        FUTURE MOAT modules: forecast vs actual, CPR ROI, funnel conversion, feasibility hours saved.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
      <div className="font-mono text-[20px] font-semibold tabular">{value}</div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
    </div>
  );
}
