/**
 * Ingest US_Clinical_Site_Networks_Database.csv → data/sites.json
 * Computes Scorecard five quality scores (percentile-normalized)
 * for sites with a CT.gov footprint (hist trials > 0).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "papaparse";
const { parse } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "data", "sites.csv");
const outPath = path.join(root, "data", "sites.json");

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function yn(v) {
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  return s.startsWith("Y") || s === "TRUE" || s === "1" || s.startsWith("YES");
}

function slugify(name, i) {
  const base = String(name || "site")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base}-${i}`;
}

function recruitSophistication(row) {
  const flags = [
    row["Meta Pixel"],
    row["Facebook Ads"],
    row["Google Ads"],
    row["Trial Finder"],
    row["Patient Database"],
    row["Recruitment Pages"],
    row["Advertises Patient Recruitment"],
  ];
  const hits = flags.filter(yn).length;
  return Math.min(1, hits / 5);
}

function percentileRanks(values) {
  const indexed = values
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v != null && Number.isFinite(x.v));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(null);
  const n = indexed.length;
  if (n === 0) return ranks;
  for (let r = 0; r < n; r++) {
    ranks[indexed[r].i] = n === 1 ? 100 : Math.round((100 * r) / (n - 1));
  }
  return ranks;
}

function band(score) {
  if (score == null) return "unscored";
  if (score >= 80) return "elite";
  if (score >= 60) return "strong";
  if (score >= 40) return "mid";
  return "thin";
}

const raw = fs.readFileSync(csvPath, "utf8");
const parsed = parse(raw, { header: true, skipEmptyLines: true });
if (parsed.errors?.length) {
  console.warn("CSV parse warnings:", parsed.errors.slice(0, 5));
}

const rows = parsed.data;

const sites = rows.map((row, i) => {
  const histTrials = num(row["Historical Trials (CT.gov)"]) ?? 0;
  const completed = num(row["Completed"]) ?? 0;
  const completionRate = num(row["Completion Rate %"]);
  const yearsActive = num(row["Years Active"]) ?? 0;
  const totalEnrollment = num(row["Total Realized Enrollment"]) ?? 0;
  const phase3 = num(row["Phase 3 Trials"]) ?? 0;
  const phase2 = num(row["Phase 2 Trials"]) ?? 0;
  const activeNow = num(row["Active Now"]) ?? 0;
  const therapeuticBreadth = num(row["Therapeutic Breadth (conditions)"]) ?? 0;
  const investigators = num(row["Number of Investigators"]);
  const coordinators = num(row["Approx Coordinator Count"]);
  const icp = num(row["Intera ICP Score"]) ?? 0;

  // Prefer CSV-published quality scores when present (updated databases ship these).
  const csvOverall = num(row["Overall Site Quality"]);
  const csvRecruit = num(row["Recruitment Strength"]);
  const csvOps = num(row["Operational Maturity"]);
  const csvSponsor = num(row["Sponsor Attractiveness"]);
  const csvTher = num(row["Therapeutic Expertise"]);
  const hasCsvScores =
    csvOverall != null ||
    csvRecruit != null ||
    csvOps != null ||
    csvSponsor != null ||
    csvTher != null;

  const csvEnrollmentVelocity = num(row["Enrollment Velocity (inf)"]);
  const csvStartupSpeed = num(row["Startup Speed (inf)"]);
  const csvRecruitSoph = num(row["Recruitment Sophistication"]);
  const csvPublication = num(row["Publication History (inf)"]);

  const recruitSoph =
    csvRecruitSoph != null ? Math.min(1, csvRecruitSoph / 100) : recruitSophistication(row);
  const enrollmentVelocity =
    csvEnrollmentVelocity != null
      ? csvEnrollmentVelocity
      : yearsActive > 0
        ? totalEnrollment / yearsActive
        : totalEnrollment;

  // Inferred startup proxy (Scorecard): completion + active pipeline + expansion
  const expansion = yn(row["Expansion"]) ? 1 : 0;
  const startupProxy =
    csvStartupSpeed != null
      ? Math.min(1, csvStartupSpeed / 100)
      : (completionRate ?? 50) / 100 * 0.5 +
        Math.min(1, activeNow / 50) * 0.3 +
        expansion * 0.2;

  // Prefer structured Top Sponsors / Named CROs when present.
  const topSponsors = String(row["Top Sponsors"] ?? "").trim();
  const namedCros = String(row["Named CROs"] ?? "").trim();
  const sponsorsText =
    topSponsors ||
    String(row["Sponsors Worked With"] ?? "").trim();
  const crosText =
    namedCros ||
    String(row["CROs Worked With"] ?? "").trim();
  const sponsorRichness =
    !sponsorsText || /^unknown$/i.test(sponsorsText)
      ? 0
      : Math.min(
          1,
          sponsorsText.length / 80 +
            (sponsorsText.toLowerCase().includes("multiple") ? 0.3 : 0) +
            (/,|;/.test(sponsorsText) ? 0.2 : 0),
        );
  const croRichness =
    !crosText || /^unknown$/i.test(crosText)
      ? 0
      : Math.min(1, crosText.length / 60 + (/,|;|multiple/i.test(crosText) ? 0.3 : 0));

  const scorable = histTrials > 0 || hasCsvScores;

  return {
    id: slugify(row["Name"], i),
    name: row["Name"] || `Site ${i}`,
    website: row["Website"] || "",
    hq: row["HQ"] || "",
    type: row["Type"] || "",
    estimatedSiteCount: row["Estimated Site Count"] || "",
    states: row["States"] || "",
    statesList: String(row["States"] || "")
      .split(/,|;/)
      .map((s) => s.trim())
      .filter(Boolean),
    icpScore: icp,
    histTrials,
    completed,
    terminated: num(row["Terminated/Withdrawn"]) ?? 0,
    completionRate,
    activeNow,
    recruitingStudies: num(row["Recruiting Studies"]) ?? 0,
    phase2,
    phase3,
    totalEnrollment,
    firstStudyYear: num(row["First Study Year"]),
    yearsActive,
    therapeuticBreadth,
    performanceMatchConfidence: row["Performance Match Confidence"] || "",
    sponsorDiversity: num(row["Sponsor Diversity (#)"]),
    croDiversity: num(row["CRO Diversity (#)"]),
    repeatSponsors: num(row["Repeat Sponsors (#)"]),
    industrySponsoredStudies: num(row["Industry-Sponsored Studies"]),
    topSponsors,
    namedCros,
    publicationHistory: csvPublication,
    ctms: row["CTMS"] || "",
    ehr: row["EHR"] || "",
    eSource: yn(row["eSource"]),
    eConsent: yn(row["eConsent"]),
    florence: yn(row["Florence"]),
    crio: yn(row["CRIO"]),
    clinicalConductor: yn(row["Clinical Conductor"]),
    realTime: yn(row["RealTime"]),
    epic: yn(row["Epic"]),
    cerner: yn(row["Cerner"]),
    therapeuticAreas: row["Therapeutic Areas"] || "",
    therapeuticSpecialties: row["Therapeutic Specialties (detail)"] || "",
    languages: row["Languages"] || "",
    spanish: /spanish/i.test(row["Languages"] || ""),
    homeVisits: row["Home Visits"] || "",
    decentralizedCapabilities: row["Decentralized Capabilities"] || "",
    mentionsDct: yn(row["Mentions DCT"]) || /Y/i.test(row["Mentions DCT"] || ""),
    investigators,
    coordinators,
    sponsorsWorkedWith: sponsorsText,
    crosWorkedWith: crosText,
    publicPartnerships: row["Public Partnerships"] || "",
    recentHiring: row["Recent Hiring"] || "",
    expansion: row["Expansion"] || "",
    funding: row["Funding"] || "",
    acquisitions: row["Acquisitions"] || "",
    ownerParent: row["Owner/Parent/Funding"] || "",
    facebookAds: yn(row["Facebook Ads"]),
    metaPixel: yn(row["Meta Pixel"]),
    googleAds: yn(row["Google Ads"]),
    seo: row["SEO"] || "",
    trialFinder: yn(row["Trial Finder"]),
    patientDatabase: String(row["Patient Database"] || "").trim(),
    hasPatientDatabase: Boolean(
      String(row["Patient Database"] || "").trim() &&
        !/^(n|no|unknown)$/i.test(String(row["Patient Database"]).trim()),
    ),
    recruitmentPages: yn(row["Recruitment Pages"]),
    advertisesRecruitment: yn(row["Advertises Patient Recruitment"]),
    technologyStack: row["Technology Stack"] || "",
    ctmsMentions: row["CTMS Mentions"] || "",
    usesAi: yn(row["Uses AI"]),
    buildsTech: row["Builds Tech Internally or Vendors"] || "",
    currentRecruitingVisible: row["Current Recruiting Studies Visible"] || "",
    isRecruitingVisible: yn(row["Current Recruiting Studies Visible"]),
    ceo: row["CEO"] || "",
    vpClinicalOps: row["VP Clinical Operations"] || "",
    vpSiteOps: row["VP Site Operations"] || "",
    vpRecruitment: row["VP Recruitment/Innovation"] || "",
    contactEmails: row["Contact Emails"] || "",
    linkedin: row["LinkedIn URL"] || "",
    recruitmentCapability: row["Recruitment Capability"] || "",
    notes: row["Notes"] || "",
    // computed / CSV-preferred features
    recruitSophistication: Math.round(recruitSoph * 100) / 100,
    enrollmentVelocity: Math.round(enrollmentVelocity),
    startupProxy: Math.round(startupProxy * 100) / 100,
    sponsorRichness: Math.round(sponsorRichness * 100) / 100,
    croRichness: Math.round(croRichness * 100) / 100,
    scorable,
    hasCsvScores,
    csvScores: hasCsvScores
      ? {
          recruitmentStrength: csvRecruit,
          operationalMaturity: csvOps,
          sponsorAttractiveness: csvSponsor,
          therapeuticExpertise: csvTher,
          overallSiteQuality: csvOverall,
        }
      : null,
    // filled after percentile pass (or from CSV)
    scores: {
      recruitmentStrength: null,
      operationalMaturity: null,
      sponsorAttractiveness: null,
      therapeuticExpertise: null,
      overallSiteQuality: null,
      band: "unscored",
    },
  };
});

// Build raw composites for scorable sites, then percentile-normalize
const recruitRaw = sites.map((s) =>
  s.scorable
    ? s.recruitSophistication * 40 +
      Math.log10(1 + s.enrollmentVelocity) * 20 +
      Math.log10(1 + s.totalEnrollment) * 15
    : null,
);
const opsRaw = sites.map((s) =>
  s.scorable
    ? Math.log10(1 + s.histTrials) * 25 +
      Math.log10(1 + s.completed) * 20 +
      (s.completionRate ?? 0) * 0.35 +
      Math.min(40, s.yearsActive) * 0.5 +
      s.startupProxy * 25
    : null,
);
const sponsorRaw = sites.map((s) =>
  s.scorable
    ? s.sponsorRichness * 40 +
      s.croRichness * 25 +
      Math.log10(1 + s.histTrials) * 20 +
      (s.completionRate ?? 0) * 0.2
    : null,
);
const therRaw = sites.map((s) =>
  s.scorable
    ? Math.log10(1 + s.therapeuticBreadth) * 25 +
      Math.log10(1 + s.phase3) * 30 +
      Math.log10(1 + s.histTrials) * 15 +
      Math.min(40, s.yearsActive) * 0.4
    : null,
);

const recruitPct = percentileRanks(recruitRaw);
const opsPct = percentileRanks(opsRaw);
const sponsorPct = percentileRanks(sponsorRaw);
const therPct = percentileRanks(therRaw);

let scored = 0;
let fromCsv = 0;
for (let i = 0; i < sites.length; i++) {
  if (!sites[i].scorable) continue;
  scored++;

  if (sites[i].hasCsvScores && sites[i].csvScores) {
    fromCsv++;
    const c = sites[i].csvScores;
    const recruitmentStrength = c.recruitmentStrength ?? recruitPct[i] ?? 0;
    const operationalMaturity = c.operationalMaturity ?? opsPct[i] ?? 0;
    const sponsorAttractiveness = c.sponsorAttractiveness ?? sponsorPct[i] ?? 0;
    const therapeuticExpertise = c.therapeuticExpertise ?? therPct[i] ?? 0;
    const overallSiteQuality =
      c.overallSiteQuality ??
      Math.round(
        0.3 * operationalMaturity +
          0.28 * recruitmentStrength +
          0.22 * sponsorAttractiveness +
          0.2 * therapeuticExpertise,
      );
    sites[i].scores = {
      recruitmentStrength,
      operationalMaturity,
      sponsorAttractiveness,
      therapeuticExpertise,
      overallSiteQuality,
      band: band(overallSiteQuality),
    };
  } else {
    const recruitmentStrength = recruitPct[i];
    const operationalMaturity = opsPct[i];
    const sponsorAttractiveness = sponsorPct[i];
    const therapeuticExpertise = therPct[i];
    const overallSiteQuality = Math.round(
      0.3 * operationalMaturity +
        0.28 * recruitmentStrength +
        0.22 * sponsorAttractiveness +
        0.2 * therapeuticExpertise,
    );
    sites[i].scores = {
      recruitmentStrength,
      operationalMaturity,
      sponsorAttractiveness,
      therapeuticExpertise,
      overallSiteQuality,
      band: band(overallSiteQuality),
    };
  }

  // Drop ingest-only helpers from persisted JSON
  delete sites[i].hasCsvScores;
  delete sites[i].csvScores;
}

// Clean helpers on unscored too
for (const s of sites) {
  delete s.hasCsvScores;
  delete s.csvScores;
}

sites.sort(
  (a, b) =>
    (b.scores.overallSiteQuality ?? -1) - (a.scores.overallSiteQuality ?? -1),
);

const meta = {
  generatedAt: new Date().toISOString(),
  source: "US_Clinical_Site_Networks_Database.csv",
  scorecard:
    fromCsv > 0
      ? "CSV-published scorecard preferred; otherwise percentile composites on CT.gov + web signals"
      : "US_Clinical_Site_Quality_Scorecard — percentile composites on CT.gov + web signals",
  total: sites.length,
  scored,
  unscored: sites.length - scored,
  scoresFromCsv: fromCsv,
  note: "Overall prefers CSV Overall Site Quality when present; else 0.30 Ops + 0.28 Recruit + 0.22 Sponsor + 0.20 Therapeutic. Absolute accrual not public.",
};

fs.writeFileSync(outPath, JSON.stringify({ meta, sites }, null, 0));
console.log(
  `Wrote ${sites.length} sites (${scored} scored, ${fromCsv} from CSV scores) → ${path.relative(root, outPath)}`,
);
