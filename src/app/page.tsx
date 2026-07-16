import { AlgorithmExplainer } from "@/components/AlgorithmExplainer";
import { AtlasMark } from "@/components/AtlasMark";
import { HeroConnectionPreview } from "@/components/HeroConnectionPreview";
import { ProtocolMatcher } from "@/components/ProtocolMatcher";
import { getAllSites, getMeta } from "@/lib/sites";
import Link from "next/link";

export default function HomePage() {
  const meta = getMeta();
  const sites = getAllSites();

  return (
    <div>
      {/* 1. Hero */}
      <section className="border-b border-[var(--line)]">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 pb-12 pt-10 sm:pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-12">
          <div>
            <div className="flex items-center gap-3">
              <AtlasMark size={36} />
              <p className="text-[12px] font-medium tracking-wide text-[var(--accent)]">
                Verified clinical research network
              </p>
            </div>
            <h1 className="mt-4 max-w-xl text-[32px] font-semibold leading-[1.12] tracking-tight sm:text-[40px]">
              Find who should meet for the next trial.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">
              Atlas combines observed trial history with verified organization signals — capacity,
              study interest, sponsor preferences, CRO capabilities, and relationship data — to
              recommend the right sites, sponsors, and partners for each protocol.
            </p>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[var(--ink)]/80">
              Upload a protocol to find the right sites. Claim your organization to make future
              matches better.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#rank"
                className="inline-flex h-11 items-center rounded-md bg-[var(--accent)] px-5 text-[14px] font-medium text-white hover:opacity-90"
              >
                Run protocol match
              </a>
              <Link
                href="/join"
                className="inline-flex h-11 items-center rounded-md border border-[var(--line)] px-5 text-[14px] font-medium hover:bg-[var(--hover)]"
              >
                Claim your organization
              </Link>
            </div>
            <p className="mt-4 text-[12px] text-[var(--muted)]">
              {meta.total.toLocaleString()} U.S. sites · {meta.scored.toLocaleString()} quality-scored
              · observed history stays Intera-owned
            </p>
            <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-[var(--muted)]">
              Built alongside clinical research sites, sponsors, and CROs. Now onboarding pilot
              partners.
            </p>
          </div>
          <HeroConnectionPreview />
        </div>
      </section>

      {/* 2. Protocol wedge */}
      <section className="border-b border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Have a protocol? Generate a site shortlist.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            Upload a protocol, synopsis, or eligibility criteria. Atlas extracts key enrollment
            requirements and matches them against the verified org graph.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Ranked shortlist", "Protocol-specific site recommendations."],
              ["Match evidence", "Observed and verified signals behind each recommendation."],
              [
                "Risk flags",
                "Missing data, capacity uncertainty, competing studies, quality concerns.",
              ],
              [
                "Intro path",
                "Save to portfolio, request introduction, or invite a verified organization.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="border border-[var(--line)] px-4 py-3">
                <div className="text-[13px] font-semibold tracking-tight">{t}</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <ProtocolMatcher sites={sites} />
          </div>
        </div>
      </section>

      {/* 3. Claim flow */}
      <section className="border-b border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Claimed organizations make Atlas smarter.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            Every site, sponsor, and CRO starts as an observed public profile. Verified
            organizations can add current capacity, study interests, preferences, and relationship
            signals without overwriting Intera&apos;s observed data.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ClaimCard
              role="Sites & site networks"
              body="Show active capacity, preferred therapeutic areas, seeking-studies status, and Intera opt-in."
              href="/join/site"
              cta="Claim site profile"
            />
            <ClaimCard
              role="Sponsors"
              body="Manage protocols under consideration, preferred site traits, saved portfolios, and intro requests."
              href="/join/sponsor"
              cta="Claim sponsor profile"
            />
            <ClaimCard
              role="CROs"
              body="Publish capabilities, preferred site networks, therapeutic focus, and study support areas."
              href="/join/sponsor"
              cta="Claim CRO profile"
            />
          </div>

          <p className="mt-6 max-w-2xl border-l-2 border-[var(--accent)] pl-3 text-[12px] leading-relaxed text-[var(--muted)]">
            Claiming does not let organizations edit observed quality scores or trial history.
            Disputes go through Intera review.
          </p>
        </div>
      </section>

      {/* 4. Relationship layer */}
      <section className="border-b border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Atlas recommends who should meet. Relationships close deals.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            Follow organizations, save shortlists, request introductions, and express study
            interest. Atlas is the routing layer — not another CRM.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Follow", "Save to portfolio", "Request intro", "Invite to study", "Express interest"].map(
              (a) => (
                <span
                  key={a}
                  className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink)]"
                >
                  {a}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* 5. Trust / methodology */}
      <section id="how-it-works" className="scroll-mt-16 border-b border-[var(--line)]">
        <div className="mx-auto max-w-5xl px-5 pt-12">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Observed data stays separate from claimed data.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            Claimed organizations enrich Atlas. They do not overwrite the observed graph.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <TrustLayer
              source="Observed"
              title="Intera observed"
              items={[
                "CT.gov history",
                "Quality scorecard",
                "Historical trials",
                "Completion signals",
                "Recruitment sophistication",
              ]}
            />
            <TrustLayer
              source="Verified"
              title="Verified enrichment"
              items={[
                "Logo & description",
                "Public study interests",
                "Verified badge",
                "Capabilities",
              ]}
            />
            <TrustLayer
              source="Private"
              title="Private matching signals"
              items={[
                "Capacity",
                "Seeking studies",
                "Sponsor preferences",
                "Protocol vaults",
                "Portfolios & relationships",
              ]}
            />
          </div>
        </div>
        <AlgorithmExplainer />
      </section>
    </div>
  );
}

function ClaimCard({
  role,
  body,
  href,
  cta,
}: {
  role: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col border border-[var(--line)] p-5">
      <div className="text-[14px] font-semibold tracking-tight">{role}</div>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--muted)]">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex h-9 w-fit items-center rounded-md border border-[var(--line)] px-3 text-[12px] font-medium hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
      >
        {cta}
      </Link>
    </div>
  );
}

function TrustLayer({
  source,
  title,
  items,
}: {
  source: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="border border-[var(--line)] bg-[var(--bg)] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        {source}
      </div>
      <div className="mt-1 text-[14px] font-semibold tracking-tight">{title}</div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12px] text-[var(--muted)]">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ink)]/30" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
