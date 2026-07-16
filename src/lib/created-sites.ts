import type { OrgClaim } from "@/lib/org-types";
import { domainFromWebsite, emailDomain } from "@/lib/org-types";
import type { Site } from "@/lib/types";

/** Build an unscored Site stub from a user-created org claim. */
export function siteStubFromClaim(claim: OrgClaim): Site {
  const id = claim.linkedSiteId || `created-${claim.id}`;
  return {
    id,
    name: claim.orgName,
    website: claim.website || `https://${claim.domain}`,
    hq: claim.hq || "",
    type: claim.siteType || "Research Site (user-created)",
    estimatedSiteCount: "",
    states: claim.geography || "",
    statesList: (claim.geography || "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
    icpScore: 0,
    histTrials: 0,
    completed: 0,
    terminated: 0,
    completionRate: null,
    activeNow: 0,
    phase2: 0,
    phase3: 0,
    totalEnrollment: 0,
    firstStudyYear: null,
    yearsActive: 0,
    therapeuticBreadth: 0,
    performanceMatchConfidence: "unscored — user-created profile",
    ctms: "",
    ehr: "",
    eSource: false,
    eConsent: false,
    florence: false,
    crio: false,
    clinicalConductor: false,
    realTime: false,
    epic: false,
    cerner: false,
    therapeuticAreas: claim.sitePrivate?.preferredTherapeuticAreas || "",
    therapeuticSpecialties: claim.sitePrivate?.seekingStudies || "",
    languages: "",
    spanish: false,
    homeVisits: "",
    decentralizedCapabilities: "",
    mentionsDct: false,
    investigators: null,
    coordinators: null,
    sponsorsWorkedWith: claim.sitePrivate?.preferredSponsors || "",
    crosWorkedWith: claim.sitePrivate?.preferredCros || "",
    publicPartnerships: "",
    recentHiring: "",
    expansion: claim.sitePrivate?.upcomingExpansions || "",
    funding: "",
    acquisitions: "",
    ownerParent: "",
    facebookAds: false,
    metaPixel: false,
    googleAds: false,
    seo: "",
    trialFinder: false,
    patientDatabase: "",
    hasPatientDatabase: false,
    recruitmentPages: false,
    advertisesRecruitment: false,
    technologyStack: claim.publicTech || "",
    ctmsMentions: "",
    usesAi: false,
    buildsTech: "",
    currentRecruitingVisible: "",
    isRecruitingVisible: false,
    ceo: "",
    vpClinicalOps: "",
    vpSiteOps: "",
    vpRecruitment: "",
    contactEmails: claim.workEmail,
    linkedin: "",
    recruitmentCapability: "",
    notes:
      claim.publicBio ||
      "User-created Atlas profile. Not yet scored from ClinicalTrials.gov / web signals. Observed Quality Scorecard pending Intera ingest.",
    recruitSophistication: 0,
    enrollmentVelocity: 0,
    startupProxy: 0.4,
    sponsorRichness: 0,
    croRichness: 0,
    scorable: false,
    scores: {
      recruitmentStrength: null,
      operationalMaturity: null,
      sponsorAttractiveness: null,
      therapeuticExpertise: null,
      overallSiteQuality: null,
      band: "unscored",
    },
  };
}

/**
 * For new profiles: website hostname must match email domain.
 */
export function websiteMatchesEmailDomain(
  website: string,
  email: string,
): { ok: boolean; webDomain: string | null; emailDom: string } {
  const emailDom = emailDomain(email);
  const webDomain = domainFromWebsite(website);
  if (!webDomain || !emailDom) return { ok: false, webDomain, emailDom };
  const ok =
    emailDom === webDomain ||
    emailDom.endsWith(`.${webDomain}`) ||
    webDomain.endsWith(`.${emailDom}`);
  return { ok, webDomain, emailDom };
}

export function slugifyOrgId(name: string): string {
  return `created-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)}-${Date.now().toString(36)}`;
}
