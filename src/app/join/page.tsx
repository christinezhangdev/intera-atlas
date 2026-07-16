import Link from "next/link";

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-[12px] font-medium tracking-wide text-[var(--accent)]">
        Request Atlas access
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Who are you?</h1>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--muted)]">
        Submit a request with your company work email. Intera will contact you to verify your
        organization and set up your account — nothing auto-publishes or overwrites observed
        quality data.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/join/site"
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--accent)]">
            Site / site network
          </div>
          <h2 className="mt-2 text-[16px] font-semibold">I run research sites</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Request access for your existing Atlas profile (or ask us to add you) so we can enable
            capacity and study-intent matching.
          </p>
          <span className="mt-4 inline-block text-[13px] font-medium text-[var(--accent)]">
            Continue →
          </span>
        </Link>

        <Link
          href="/join/sponsor"
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--accent)]">
            Sponsor / CRO
          </div>
          <h2 className="mt-2 text-[16px] font-semibold">I place or run studies</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Request a sponsor or CRO workspace. We&apos;ll contact you to set up protocols,
            preferences, and shortlists.
          </p>
          <span className="mt-4 inline-block text-[13px] font-medium text-[var(--accent)]">
            Continue →
          </span>
        </Link>
      </div>

      <p className="mt-8 text-[12px] text-[var(--muted)]">
        Already browsing? Open any site profile and use{" "}
        <span className="text-[var(--ink)]">Is this you?</span> to request access with your work
        email.
      </p>
      <p className="mt-3 text-[12px]">
        <Link href="/join/new-site" className="font-medium text-[var(--accent)] underline">
          Don&apos;t see your site? Request a new profile
        </Link>
      </p>
    </div>
  );
}
