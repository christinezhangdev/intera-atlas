import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimBanner } from "@/components/ClaimBanner";
import { QualityRow, ScoreChip } from "@/components/ScoreChip";
import { getDirectorySiteById } from "@/lib/directory";
import { formatNumber } from "@/lib/format";
import { getClaimBySiteId } from "@/lib/org-store";
import { getSiteClaimHint } from "@/lib/sponsors";
import { liftability, indicationFit } from "@/lib/sites";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === false) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-[var(--line)] py-1.5 text-[12px]">
      <div className="text-[var(--muted)]">{label}</div>
      <div className="min-w-0 break-words">{value === true ? "Yes" : value}</div>
    </div>
  );
}

export default async function SiteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await getDirectorySiteById(id);
  if (!site) notFound();

  const sampleInd = indicationFit(site, "cardiometabolic obesity diabetes");
  const lift = liftability(site, sampleInd);
  const existingClaim = await getClaimBySiteId(id);
  const claimHint = site.id.startsWith("created-")
    ? { domain: existingClaim?.domain || null, website: site.website }
    : getSiteClaimHint(id);
  // Only Intera-approved verified claims show as claimed (requests no longer auto-activate)
  const claimed = existingClaim?.status === "verified";

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <div className="mb-1 text-[11px] text-[var(--muted)]">
        <Link href="/sites" className="hover:underline">
          Sites
        </Link>
        <span> / </span>
        <span>{site.name}</span>
      </div>

      <ClaimBanner
        orgName={site.name}
        domain={claimHint.domain || existingClaim?.domain || null}
        linkedSiteId={site.id}
        role="site"
        claimed={claimed}
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight">{site.name}</h1>
            {claimed ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                Verified
                {existingClaim?.domain ? ` · @${existingClaim.domain}` : ""}
              </span>
            ) : (
              <span className="rounded-full bg-[var(--hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                Unclaimed profile
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--muted)]">
            {site.type} · {site.hq}
            {site.estimatedSiteCount ? ` · ~${site.estimatedSiteCount} sites` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
            {site.website ? (
              <a href={site.website} target="_blank" rel="noreferrer" className="underline">
                Website
              </a>
            ) : null}
            {site.linkedin ? (
              <a href={site.linkedin} target="_blank" rel="noreferrer" className="underline">
                LinkedIn
              </a>
            ) : null}
            <Link href="/#rank" className="font-medium underline">
              Rank for protocol
            </Link>
          </div>
        </div>
        <div className="rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Intera lens
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <span>
              ICP <span className="font-mono font-semibold">{site.icpScore}</span>
            </span>
            <span>
              Lift (cardio sample){" "}
              <span className="font-mono font-semibold">{lift.toFixed(2)}</span>
            </span>
            <span>
              Recruit soph{" "}
              <span className="font-mono font-semibold">{site.recruitSophistication}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-[var(--muted)]">
          Quality Scorecard (1–100)
        </div>
        <QualityRow scores={site.scores} />
        {!site.scorable ? (
          <p className="mt-2 text-[11px] text-amber-700">
            Unscored — no CT.gov footprint match. Honest gap, not zero.
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Performance (observed)</h2>
          <Field label="Historical trials" value={formatNumber(site.histTrials)} />
          <Field label="Completed" value={formatNumber(site.completed)} />
          <Field label="Terminated/Withdrawn" value={formatNumber(site.terminated)} />
          <Field label="Completion rate" value={site.completionRate != null ? `${site.completionRate}%` : null} />
          <Field label="Active now" value={formatNumber(site.activeNow)} />
          <Field label="Phase 2" value={formatNumber(site.phase2)} />
          <Field label="Phase 3" value={formatNumber(site.phase3)} />
          <Field label="Realized enrollment" value={formatNumber(site.totalEnrollment)} />
          <Field label="First study year" value={site.firstStudyYear} />
          <Field label="Years active" value={site.yearsActive} />
          <Field label="Match confidence" value={site.performanceMatchConfidence} />
          <Field label="Enrollment velocity (inf)" value={formatNumber(site.enrollmentVelocity)} />
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Therapeutic</h2>
          <Field label="Areas" value={site.therapeuticAreas} />
          <Field label="Specialties" value={site.therapeuticSpecialties} />
          <Field label="Breadth (conditions)" value={formatNumber(site.therapeuticBreadth)} />
          <Field label="Languages" value={site.languages} />
          <Field label="States" value={site.states} />
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Recruitment (web observed)</h2>
          <Field label="Meta Pixel" value={site.metaPixel} />
          <Field label="Facebook Ads" value={site.facebookAds} />
          <Field label="Google Ads" value={site.googleAds} />
          <Field label="Trial Finder" value={site.trialFinder} />
          <Field label="Patient database" value={site.patientDatabase || site.hasPatientDatabase} />
          <Field label="Recruitment pages" value={site.recruitmentPages} />
          <Field label="Advertises recruitment" value={site.advertisesRecruitment} />
          <Field label="SEO" value={site.seo} />
          <Field label="Capability notes" value={site.recruitmentCapability} />
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Relationships</h2>
          <Field label="Sponsors" value={site.sponsorsWorkedWith} />
          <Field label="CROs" value={site.crosWorkedWith} />
          <Field label="Partnerships" value={site.publicPartnerships} />
          <Field label="Owner / parent" value={site.ownerParent} />
          <Field label="Funding" value={site.funding} />
          <Field label="Acquisitions" value={site.acquisitions} />
          <Field label="Expansion" value={site.expansion} />
          <Field label="Recent hiring" value={site.recentHiring} />
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Capacity & people</h2>
          <Field label="Investigators" value={formatNumber(site.investigators)} />
          <Field label="Coordinators" value={formatNumber(site.coordinators)} />
          <Field label="CEO" value={site.ceo} />
          <Field label="VP Clinical Ops" value={site.vpClinicalOps} />
          <Field label="VP Site Ops" value={site.vpSiteOps} />
          <Field label="VP Recruitment" value={site.vpRecruitment} />
          <Field label="Emails" value={site.contactEmails} />
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Tech & DCT</h2>
          <Field label="CTMS" value={site.ctms || site.ctmsMentions} />
          <Field label="EHR" value={site.ehr} />
          <Field label="eSource" value={site.eSource} />
          <Field label="eConsent" value={site.eConsent} />
          <Field label="Florence" value={site.florence} />
          <Field label="CRIO" value={site.crio} />
          <Field label="Clinical Conductor" value={site.clinicalConductor} />
          <Field label="RealTime" value={site.realTime} />
          <Field label="Epic" value={site.epic} />
          <Field label="Cerner" value={site.cerner} />
          <Field label="Uses AI" value={site.usesAi} />
          <Field label="Builds tech" value={site.buildsTech} />
          <Field label="Home visits" value={site.homeVisits} />
          <Field label="DCT / decentralized" value={site.decentralizedCapabilities || site.mentionsDct} />
          <Field label="Tech stack" value={site.technologyStack} />
          <Field label="Recruiting visible" value={site.currentRecruitingVisible} />
        </section>
      </div>

      {site.notes ? (
        <section className="mt-8">
          <h2 className="mb-2 text-[13px] font-semibold">Notes</h2>
          <p className="text-[12px] leading-relaxed text-[var(--ink)]">{site.notes}</p>
        </section>
      ) : null}

      <div className="mt-8 rounded border border-[var(--line)] p-3">
        <h2 className="mb-2 text-[13px] font-semibold">Recommendation features (sample indication)</h2>
        <div className="flex flex-wrap gap-4 text-[12px]">
          <span>
            Ind fit <span className="font-mono">{sampleInd.toFixed(2)}</span>
          </span>
          <span>
            Liftability <span className="font-mono">{lift.toFixed(2)}</span>
          </span>
          <ScoreChip label="Overall" value={site.scores.overallSiteQuality} />
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          FUTURE MOAT: absolute enrollment rates, funnel CPR, measured SSU, screen-fail reasons.
        </p>
      </div>
    </div>
  );
}
