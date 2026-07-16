import Link from "next/link";
import { getAllSites } from "@/lib/sites";

export default function GraphPage() {
  const sites = getAllSites();

  const edges: { from: string; to: string; siteId: string; kind: string }[] = [];
  for (const s of sites) {
    const sponsors = s.sponsorsWorkedWith;
    if (
      sponsors &&
      !/^unknown$/i.test(sponsors) &&
      !/^multiple pharma/i.test(sponsors) &&
      sponsors.length < 120
    ) {
      const parts = sponsors.split(/,|;/).map((p) => p.trim()).filter((p) => p.length > 2 && p.length < 50);
      for (const p of parts.slice(0, 4)) {
        if (/multiple|pharma\/|unspecified|various/i.test(p)) continue;
        edges.push({ from: p, to: s.name, siteId: s.id, kind: "sponsor→site" });
      }
    }
    const cros = s.crosWorkedWith;
    if (cros && !/^unknown$/i.test(cros) && cros.length < 100) {
      const parts = cros.split(/,|;/).map((p) => p.trim()).filter((p) => p.length > 2 && p.length < 50);
      for (const p of parts.slice(0, 3)) {
        if (/multiple/i.test(p)) continue;
        edges.push({ from: p, to: s.name, siteId: s.id, kind: "cro→site" });
      }
    }
  }

  const sample = edges.slice(0, 80);

  // Condition → site degree for top conditions keywords
  const conditions = ["Obesity", "Diabetes", "Alzheimer", "Oncology", "Vaccine", "NASH"];
  const conditionRows = conditions.map((c) => {
    const matches = sites.filter((s) =>
      `${s.therapeuticAreas} ${s.therapeuticSpecialties}`.toLowerCase().includes(c.toLowerCase()),
    );
    return { c, n: matches.length, top: matches.slice(0, 5) };
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-[18px] font-semibold tracking-tight">Relationship Graph</h1>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        Palantir-style paths from public CSV fields. Sparse sponsor strings stay confidence-tagged —
        many rows say &quot;Multiple pharma&quot; and are excluded from named edges.
      </p>

      <div className="mt-5 rounded border border-[var(--line)] p-3 text-[12px]">
        <div className="font-medium">Ontology (CURRENT)</div>
        <div className="mt-1 text-[var(--muted)]">
          Sponsor → Site ← CRO · Condition → Site · Investigator (counts only) · Patients (FUTURE via
          TrialPath)
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold">Condition → sites</h2>
      <div className="overflow-hidden rounded border border-[var(--line)]">
        <table className="w-full text-left text-[12px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel)] text-[10px] uppercase text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Condition</th>
              <th className="px-2 py-2">Sites</th>
              <th className="px-2 py-2">Examples</th>
            </tr>
          </thead>
          <tbody>
            {conditionRows.map((row) => (
              <tr key={row.c} className="border-b border-[var(--line)]">
                <td className="px-3 py-2 font-medium">{row.c}</td>
                <td className="px-2 py-2 font-mono">{row.n}</td>
                <td className="px-2 py-2">
                  {row.top.map((s) => (
                    <Link key={s.id} href={`/sites/${s.id}`} className="mr-2 underline">
                      {s.name}
                    </Link>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold">Named public edges (sample)</h2>
      <div className="overflow-hidden rounded border border-[var(--line)]">
        <table className="w-full text-left text-[12px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel)] text-[10px] uppercase text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Kind</th>
              <th className="px-2 py-2">From</th>
              <th className="px-2 py-2">Site</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((e, i) => (
              <tr key={`${e.from}-${e.siteId}-${i}`} className="border-b border-[var(--line)]">
                <td className="px-3 py-1.5 text-[var(--muted)]">{e.kind}</td>
                <td className="px-2 py-1.5">{e.from}</td>
                <td className="px-2 py-1.5">
                  <Link href={`/sites/${e.siteId}`} className="underline">
                    {e.to}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        Showing {sample.length} of {edges.length} parseable named edges. FUTURE MOAT: NCT-level
        study edges + Intera delivery graph.
      </p>
    </div>
  );
}
