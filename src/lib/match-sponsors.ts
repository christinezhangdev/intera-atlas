import type { OrgClaim } from "@/lib/org-types";
import { getSponsorStubs, type SponsorStub } from "@/lib/sponsors";
import { getAllSites } from "@/lib/sites";
import type { Site } from "@/lib/types";

export type SponsorMatch = {
  rank: number;
  sponsor: SponsorStub;
  score: number;
  rationale: string[];
};

/**
 * For a site org profile: find sponsors / study-fit opportunities
 * using Observed graph edges + private seeking / preferred areas.
 */
export function matchSponsorsForSite(claim: OrgClaim, limit = 20): SponsorMatch[] {
  const site = claim.linkedSiteId
    ? getAllSites().find((s) => s.id === claim.linkedSiteId)
    : undefined;

  const seeking = (
    claim.sitePrivate?.seekingStudies ||
    claim.sitePrivate?.preferredTherapeuticAreas ||
    ""
  ).toLowerCase();
  const prefSponsors = (claim.sitePrivate?.preferredSponsors || "").toLowerCase();
  const siteTa = (site?.therapeuticAreas || claim.publicBio || "").toLowerCase();
  const query = `${seeking} ${siteTa}`.trim();

  const stubs = getSponsorStubs(300);

  const scored = stubs.map((sponsor) => {
    let score = 0;
    const rationale: string[] = [];
    const hay = `${sponsor.name} ${sponsor.therapeuticHints}`.toLowerCase();

    // Historical edge: this site already worked with sponsor
    if (site && site.sponsorsWorkedWith.toLowerCase().includes(sponsor.name.toLowerCase())) {
      score += 40;
      rationale.push(`Historical relationship with ${site.name}`);
    }

    // Seeking / TA overlap
    for (const t of query.split(/[^a-z0-9]+/).filter((w) => w.length > 3)) {
      if (hay.includes(t)) {
        score += 8;
      }
    }
    if (seeking && sponsor.therapeuticHints) {
      const overlap = seeking
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3 && sponsor.therapeuticHints.toLowerCase().includes(w));
      if (overlap.length) {
        score += 20;
        rationale.push(`Matches seeking / TA: ${overlap.slice(0, 3).join(", ")}`);
      }
    }

    // Preferred sponsors list
    if (prefSponsors && prefSponsors.includes(sponsor.name.toLowerCase().slice(0, 12))) {
      score += 35;
      rationale.push("On your preferred sponsors list");
    }

    // Network volume
    score += Math.min(15, sponsor.siteCount / 2);
    if (sponsor.siteCount >= 10) {
      rationale.push(`Active with ${sponsor.siteCount} Atlas sites`);
    }

    if (!rationale.length && score > 5) {
      rationale.push("Therapeutic footprint overlap in the Atlas network");
    }

    return { sponsor, score, rationale };
  });

  return scored
    .filter((x) => x.score > 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x, i) => ({ ...x, rank: i + 1, score: Math.round(x.score * 10) / 10 }));
}

/**
 * Soft boost when a claimed site's "seeking" matches the protocol indication.
 * Pass the claim from claimsByLinkedSiteId() to avoid N+1 store reads.
 */
export function siteSeekingBoost(
  claim: OrgClaim | undefined,
  indication: string,
  keywords: string[],
): { boost: number; detail?: string } {
  if (!claim?.sitePrivate) return { boost: 0 };
  const seeking = (
    claim.sitePrivate.seekingStudies ||
    claim.sitePrivate.preferredTherapeuticAreas ||
    ""
  ).toLowerCase();
  if (!seeking) return { boost: 0 };

  const tokens = [
    ...indication.toLowerCase().split(/[^a-z0-9]+/),
    ...keywords.map((k) => k.toLowerCase()),
  ].filter((t) => t.length > 3);

  let hits = 0;
  for (const t of tokens) {
    if (seeking.includes(t)) hits++;
  }
  if (!hits) return { boost: 0 };
  const boost = Math.min(0.1, hits * 0.025);
  return {
    boost,
    detail: `Claimed site is actively seeking overlapping work (+${(boost * 100).toFixed(0)}).`,
  };
}

/**
 * Soft boost for matching sites when sponsor private prefs are present.
 */
export function sponsorPrefsBoost(site: Site, claim: OrgClaim | undefined): number {
  if (!claim?.sponsorPrivate) return 0;
  let boost = 0;
  const prefs = (
    claim.sponsorPrivate.preferredSiteCharacteristics ||
    claim.sponsorPrivate.therapeuticFocus ||
    ""
  ).toLowerCase();
  const geo = (claim.sponsorPrivate.geographyPrefs || "").toLowerCase();
  const hay = `${site.therapeuticAreas} ${site.therapeuticSpecialties} ${site.states} ${site.hq} ${site.notes}`.toLowerCase();

  for (const t of prefs.split(/[^a-z0-9]+/).filter((w) => w.length > 3)) {
    if (hay.includes(t)) boost += 0.02;
  }
  for (const t of geo.split(/[^a-z0-9]+/).filter((w) => w.length > 3)) {
    if (hay.includes(t)) boost += 0.03;
  }
  if (claim.status === "verified" || claim.status === "pending") boost += 0.02;
  return Math.min(0.12, boost);
}
