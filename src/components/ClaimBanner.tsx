"use client";

import Link from "next/link";

export function ClaimBanner({
  orgName,
  domain,
  linkedSiteId,
  role = "site",
}: {
  orgName: string;
  domain: string | null;
  linkedSiteId?: string;
  role?: "site" | "sponsor" | "cro";
  claimed?: boolean;
}) {
  const href =
    role === "site"
      ? `/join/site?siteId=${encodeURIComponent(linkedSiteId || "")}&name=${encodeURIComponent(orgName)}${domain ? `&domain=${encodeURIComponent(domain)}` : ""}`
      : `/join/sponsor?name=${encodeURIComponent(orgName)}&domain=${encodeURIComponent(domain || "")}`;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--accent-soft)]/50 px-4 py-3">
      <div>
        <div className="text-[13px] font-semibold">Is this you?</div>
        <p className="text-[12px] text-[var(--muted)]">
          Request access for <span className="text-[var(--ink)]">{orgName}</span>
          {domain ? (
            <>
              {" "}
              with your <span className="font-mono text-[var(--ink)]">@{domain}</span> work email
            </>
          ) : (
            <> using your company work email</>
          )}
          . Intera will contact you to verify and set up your account — nothing auto-publishes.
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex h-9 shrink-0 items-center rounded-md bg-[var(--accent)] px-3 text-[12px] font-medium text-white hover:opacity-90"
      >
        Request account
      </Link>
    </div>
  );
}
