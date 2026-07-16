import { SiteJoinForm } from "@/components/SiteJoinForm";
import { getSiteClaimHint } from "@/lib/sponsors";
import { getSiteById } from "@/lib/sites";

export default async function JoinSitePage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; name?: string; domain?: string }>;
}) {
  const sp = await searchParams;
  let name = sp.name || "";
  let domain = sp.domain || "";
  const siteId = sp.siteId || "";

  if (siteId) {
    const site = getSiteById(siteId);
    if (site) {
      name = name || site.name;
      const hint = getSiteClaimHint(siteId);
      domain = domain || hint.domain || "";
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <p className="text-[12px] font-medium tracking-wide text-[var(--accent)]">Site access request</p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
        {name ? `Request access for ${name}` : "Request site organization access"}
      </h1>
      <p className="mt-2 text-[13px] text-[var(--muted)]">
        Use your company work email
        {domain ? (
          <>
            {" "}
            (<span className="font-mono">@{domain}</span>)
          </>
        ) : null}
        . Intera will contact you to verify and set up the account.
      </p>
      <div className="mt-6">
        <SiteJoinForm
          defaultName={name}
          defaultSiteId={siteId}
          expectedDomain={domain}
        />
      </div>
    </div>
  );
}
