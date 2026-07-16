import { getAllSites } from "@/lib/sites";
import {
  domainFromWebsite,
  emailDomain,
  isConsumerEmailDomain,
} from "@/lib/org-types";
import type { Site } from "@/lib/types";

/** Domains that are never valid for claiming commercial site networks */
const BLOCKED_CLAIM_SUFFIXES = [
  ".edu",
  ".gov",
  ".mil",
  "harvard.edu",
  "college.harvard.edu",
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
];

export function isBlockedClaimEmailDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  if (isConsumerEmailDomain(d)) return true;
  if (BLOCKED_CLAIM_SUFFIXES.some((s) => d === s || d.endsWith(s))) return true;
  // any bare .edu / .gov left-edge
  if (d.endsWith(".edu") || d.endsWith(".gov") || d.endsWith(".ac.uk")) return true;
  return false;
}

/**
 * Extract every plausible official domain for a site:
 * website host(s) + domains found in contactEmails.
 */
export function officialDomainsForSite(site: Site): string[] {
  const out = new Set<string>();

  const webs = (site.website || "")
    .split(/[\s,/|]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  for (const w of webs) {
    const d = domainFromWebsite(w);
    if (d) out.add(d);
  }

  const emails = (site.contactEmails || "").match(
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  );
  if (emails) {
    for (const e of emails) {
      const d = emailDomain(e);
      if (d && !isConsumerEmailDomain(d) && !d.endsWith(".edu")) out.add(d);
    }
  }

  return [...out];
}

/** Does email domain match any official org domain (exact or subdomain)? */
export function emailMatchesOfficial(
  emailDom: string,
  official: string[],
): boolean {
  if (!emailDom || !official.length) return false;
  const a = emailDom.toLowerCase();
  return official.some((b) => {
    const o = b.toLowerCase();
    return a === o || a.endsWith(`.${o}`);
  });
}

/**
 * Resolve a site organization the user is trying to claim by id or name.
 */
export function resolveSiteOrg(opts: {
  linkedSiteId?: string;
  orgName?: string;
}): { site: Site; officialDomains: string[] } | null {
  if (opts.linkedSiteId) {
    const site = getAllSites().find((s) => s.id === opts.linkedSiteId);
    if (!site) return null;
    return { site, officialDomains: officialDomainsForSite(site) };
  }

  const name = (opts.orgName || "").trim().toLowerCase();
  if (!name || name.length < 3) return null;

  // Prefer strong name match (contains / contained)
  const sites = getAllSites();
  const scored = sites
    .map((site) => {
      const n = site.name.toLowerCase();
      let score = 0;
      if (n === name) score = 100;
      else if (n.includes(name) || name.includes(n)) score = 80;
      else {
        const tokens = name.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
        const hits = tokens.filter((t) => n.includes(t)).length;
        if (hits >= 2 || (hits === 1 && tokens.length === 1)) score = 40 + hits * 10;
      }
      return { site, score };
    })
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  const site = scored[0].site;
  return { site, officialDomains: officialDomainsForSite(site) };
}

/**
 * Primary “official” domain for UI hints (prefer corporate site URL).
 */
export function primaryOfficialDomain(official: string[]): string | null {
  if (!official.length) return null;
  // Prefer non-academic
  const corp = official.find((d) => !d.endsWith(".edu") && !d.endsWith(".gov"));
  return corp || official[0];
}
