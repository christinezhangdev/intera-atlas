/**
 * Claimable organization profiles — sites, sponsors, CROs.
 * Private fields enrich matching; Intera Observed scores stay immutable.
 */

export type OrgRole = "site" | "sponsor" | "cro";

export type ClaimStatus = "unclaimed" | "pending" | "verified";

export type SiteOrgPrivate = {
  currentCapacity?: string;
  seekingStudies?: string;
  preferredTherapeuticAreas?: string;
  preferredSponsors?: string;
  preferredCros?: string;
  investigatorAvailability?: string;
  recruitmentGoals?: string;
  internalNotes?: string;
  upcomingExpansions?: string;
  recruitmentBudget?: string;
  wantInteraRecruitment?: boolean;
};

export type SponsorOrgPrivate = {
  protocolsUnderConsideration?: string;
  preferredSiteCharacteristics?: string;
  preferredCros?: string;
  activeFeasibility?: string;
  targetEnrollment?: string;
  therapeuticFocus?: string;
  geographyPrefs?: string;
};

export type OrgClaim = {
  id: string;
  role: OrgRole;
  /** Links to Site.id when claiming an existing stub */
  linkedSiteId?: string;
  /** True when the org was created because it wasn’t in Atlas yet */
  createdNew?: boolean;
  /** Display name of org */
  orgName: string;
  /** Guessed or provided email domain e.g. velocityclinical.com */
  domain: string;
  workEmail: string;
  status: ClaimStatus;
  createdAt: string;
  /** Public enrichment (never overwrites Observed scores) */
  publicBio?: string;
  publicTech?: string;
  website?: string;
  hq?: string;
  siteType?: string;
  geography?: string;
  /** Role-specific private fields */
  sitePrivate?: SiteOrgPrivate;
  sponsorPrivate?: SponsorOrgPrivate;
};

export type OrgStoreFile = {
  claims: OrgClaim[];
};

export function emailDomain(email: string): string {
  const part = email.trim().toLowerCase().split("@")[1] || "";
  return part.replace(/^www\./, "");
}

export function domainFromWebsite(website: string): string | null {
  if (!website) return null;
  try {
    const raw = website.startsWith("http") ? website : `https://${website}`;
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host.includes("linkedin") || host.includes("facebook")) return null;
    return host;
  } catch {
    return null;
  }
}

export function isConsumerEmailDomain(domain: string): boolean {
  const blocked = new Set([
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "aol.com",
    "me.com",
    "proton.me",
    "protonmail.com",
    "mail.com",
  ]);
  return blocked.has(domain.toLowerCase());
}

export function domainsMatch(emailDom: string, orgDom: string | null): boolean {
  if (!orgDom || !emailDom) return false;
  const a = emailDom.toLowerCase();
  const b = orgDom.toLowerCase();
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}
