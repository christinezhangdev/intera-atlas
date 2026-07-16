import { NewSiteForm } from "@/components/NewSiteForm";

export default function NewSitePage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <p className="text-[12px] font-medium tracking-wide text-[var(--accent)]">
        New organization
      </p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
        Don&apos;t see your site? Request a profile
      </h1>
      <p className="mt-2 text-[13px] text-[var(--muted)]">
        Tell us about your organization. Intera will contact you at your company work email to
        verify and create the Atlas profile — nothing goes live automatically.
      </p>
      <div className="mt-6">
        <NewSiteForm />
      </div>
    </div>
  );
}
