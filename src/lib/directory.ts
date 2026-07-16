import { siteStubFromClaim } from "@/lib/created-sites";
import { listCreatedSiteClaims, getClaimBySiteId } from "@/lib/org-store";
import { getAllSites, getSiteById as getCsvSiteById } from "@/lib/sites";
import type { Site } from "@/lib/types";

/** CSV graph + user-created site profiles (server-only). */
export async function getDirectorySites(): Promise<Site[]> {
  const created = (await listCreatedSiteClaims()).map(siteStubFromClaim);
  const ids = new Set(created.map((s) => s.id));
  return [...created, ...getAllSites().filter((s) => !ids.has(s.id))];
}

export async function getDirectorySiteById(id: string): Promise<Site | undefined> {
  const csv = getCsvSiteById(id);
  if (csv) return csv;
  const claim =
    (await getClaimBySiteId(id)) ||
    (await listCreatedSiteClaims()).find((c) => c.linkedSiteId === id);
  if (claim?.createdNew) return siteStubFromClaim(claim);
  return undefined;
}
