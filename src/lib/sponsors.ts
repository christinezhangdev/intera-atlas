import { officialDomainsForSite, primaryOfficialDomain } from "@/lib/claim-verify";
import { getAllSites } from "@/lib/sites";

export type SponsorStub = {
  id: string;
  name: string;
  domain: string | null;
  siteCount: number;
  sampleSites: string[];
  therapeuticHints: string;
};

/**
 * Materialize unclaimed sponsor stubs from “sponsors worked with” strings.
 */
export function getSponsorStubs(limit = 200): SponsorStub[] {
  const counts = new Map<string, { name: string; sites: Set<string>; tas: Set<string> }>();

  for (const site of getAllSites()) {
    const raw = site.sponsorsWorkedWith || "";
    const parts = raw
      .split(/[,;/|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 80);

    for (const name of parts) {
      const key = name.toLowerCase();
      // skip noise
      if (/^(n\/a|none|na|various|multiple|multiple pharma|pharma|tbd|unknown)$/i.test(name)) continue;
      let row = counts.get(key);
      if (!row) {
        row = { name, sites: new Set(), tas: new Set() };
        counts.set(key, row);
      }
      row.sites.add(site.id);
      for (const t of site.therapeuticAreas.split(/[,;]/).slice(0, 4)) {
        const tt = t.trim();
        if (tt) row.tas.add(tt);
      }
    }
  }

  const stubs: SponsorStub[] = [...counts.entries()]
    .map(([key, v]) => ({
      id: `sp-${key.replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
      name: v.name,
      domain: guessSponsorDomain(v.name),
      siteCount: v.sites.size,
      sampleSites: [...v.sites].slice(0, 5),
      therapeuticHints: [...v.tas].slice(0, 8).join(", "),
    }))
    .sort((a, b) => b.siteCount - a.siteCount)
    .slice(0, limit);

  return stubs;
}

export function guessSponsorDomain(name: string): string | null {
  const n = name.toLowerCase();
  const known: Record<string, string> = {
    lilly: "lilly.com",
    "eli lilly": "lilly.com",
    pfizer: "pfizer.com",
    novo: "novonordisk.com",
    "novo nordisk": "novonordisk.com",
    novartis: "novartis.com",
    roche: "roche.com",
    genentech: "gene.com",
    merck: "merck.com",
    "johnson & johnson": "jnj.com",
    janssen: "janssen.com",
    astrazeneca: "astrazeneca.com",
    "bristol-myers": "bms.com",
    "bristol myers": "bms.com",
    gilead: "gilead.com",
    amgen: "amgen.com",
    regeneron: "regeneron.com",
    sanofi: "sanofi.com",
    bayer: "bayer.com",
    abbvie: "abbvie.com",
    biogen: "biogen.com",
    moderona: "modernatx.com",
    moderna: "modernatx.com",
  };
  for (const [k, d] of Object.entries(known)) {
    if (n.includes(k)) return d;
  }
  return null;
}

export function getSiteClaimHint(siteId: string): {
  domain: string | null;
  website: string;
  officialDomains: string[];
} {
  const site = getAllSites().find((s) => s.id === siteId);
  if (!site) return { domain: null, website: "", officialDomains: [] };
  const officialDomains = officialDomainsForSite(site);
  return {
    domain: primaryOfficialDomain(officialDomains),
    website: site.website,
    officialDomains,
  };
}
