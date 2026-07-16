import { NextResponse } from "next/server";
import { getClaimById, listClaims } from "@/lib/org-store";
import { matchSponsorsForSite } from "@/lib/match-sponsors";
import { matchTrialSites } from "@/lib/match-engine";
import { parseProtocol } from "@/lib/protocol-parser";
import { getAllSites } from "@/lib/sites";
import { sponsorPrefsBoost } from "@/lib/match-sponsors";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const claimId = url.searchParams.get("claimId");
  if (!claimId) {
    const claims = await listClaims();
    return NextResponse.json({ claims: claims.slice(-20) });
  }

  const claim = await getClaimById(claimId);
  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.role === "site") {
    const sponsors = matchSponsorsForSite(claim, 25);
    return NextResponse.json({ claim, sponsors, kind: "sponsors-for-site" });
  }

  // Sponsor / CRO → synthesize a protocol-like draft from private prefs and rank sites
  const text = [
    claim.sponsorPrivate?.therapeuticFocus,
    claim.sponsorPrivate?.protocolsUnderConsideration,
    claim.sponsorPrivate?.preferredSiteCharacteristics,
    claim.sponsorPrivate?.geographyPrefs
      ? `Geography: ${claim.sponsorPrivate.geographyPrefs}`
      : null,
    claim.sponsorPrivate?.targetEnrollment
      ? `Enrollment: ${claim.sponsorPrivate.targetEnrollment}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = parseProtocol(text || `${claim.orgName} clinical research sponsor`);
  const base = matchTrialSites(getAllSites(), parsed, 30);

  const matches = base.matches
    .map((m) => {
      const boost = sponsorPrefsBoost(m.site, claim);
      return {
        ...m,
        matchScore: Math.round((m.matchScore + boost * 100) * 10) / 10,
        rationale: boost
          ? [
              {
                kind: "fit" as const,
                title: "Your uploaded preferences",
                detail: `Boosted by sponsor private prefs (+${(boost * 100).toFixed(0)} pts soft).`,
              },
              ...m.rationale,
            ]
          : m.rationale,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  return NextResponse.json({
    claim,
    kind: "sites-for-sponsor",
    parsed,
    matches,
  });
}
