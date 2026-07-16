import { SponsorJoinForm } from "@/components/SponsorJoinForm";

export default async function JoinSponsorPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; domain?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const role = sp.role === "cro" ? "cro" : "sponsor";

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <p className="text-[12px] font-medium tracking-wide text-[var(--accent)]">
        {role === "cro" ? "CRO access request" : "Sponsor access request"}
      </p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
        {sp.name ? `Request access for ${sp.name}` : "Request organization access"}
      </h1>
      <p className="mt-2 text-[13px] text-[var(--muted)]">
        Use your company work email ({sp.domain ? `@${sp.domain}` : "e.g. @lilly.com"}). Intera will
        contact you to verify and set up your account.
      </p>
      <p className="mt-2 text-[12px]">
        <a href="/join/sponsor?role=cro" className="text-[var(--accent)] underline">
          Requesting as a CRO instead?
        </a>
      </p>
      <div className="mt-6">
        <SponsorJoinForm
          defaultName={sp.name || ""}
          defaultDomain={sp.domain || ""}
          role={role}
        />
      </div>
    </div>
  );
}
