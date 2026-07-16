"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function SiteJoinForm({
  defaultName = "",
  defaultSiteId = "",
  expectedDomain = "",
}: {
  defaultName?: string;
  defaultSiteId?: string;
  expectedDomain?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ workEmail: string; orgName: string } | null>(null);
  const [workEmail, setWorkEmail] = useState(
    expectedDomain ? `you@${expectedDomain}` : "",
  );
  const [orgName, setOrgName] = useState(defaultName);
  const [message, setMessage] = useState("");
  const [seeking, setSeeking] = useState("");
  const [capacity, setCapacity] = useState("");
  const [wantIntera, setWantIntera] = useState(false);

  const hint = useMemo(() => {
    if (!expectedDomain) return null;
    return `Use your company work email ending in @${expectedDomain}`;
  }, [expectedDomain]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "site",
          workEmail,
          orgName,
          linkedSiteId: defaultSiteId || undefined,
          message,
          sitePrivate: {
            seekingStudies: seeking,
            currentCapacity: capacity,
            wantInteraRecruitment: wantIntera,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit request");
      setDone({ workEmail: data.request.workEmail, orgName: data.request.orgName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-5 py-6">
        <h2 className="text-[16px] font-semibold text-emerald-950">Request received</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-emerald-900/80">
          Thanks — Intera will contact you at{" "}
          <span className="font-medium text-emerald-950">{done.workEmail}</span> to verify{" "}
          <span className="font-medium text-emerald-950">{done.orgName}</span> and set up your
          Atlas account. Nothing goes live until we confirm with you.
        </p>
        <Link href="/" className="mt-5 inline-block text-[13px] font-medium text-[var(--accent)]">
          Back to Atlas →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-[12px] leading-relaxed text-[var(--muted)]">
        This submits a request to Intera — we don&apos;t auto-create accounts. Use your company work
        email so we can verify your organization and contact you.
      </p>
      {hint ? <p className="text-[12px] text-[var(--accent)]">{hint}</p> : null}
      {error ? <p className="text-[12px] text-amber-700">{error}</p> : null}

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Work email</span>
        <input
          required
          type="email"
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] outline-none focus:border-[var(--accent)]"
          placeholder="john@velocityclinical.com"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Organization name</span>
        <input
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">
          What should we know? (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
          placeholder="Who you are, why you want Atlas access…"
        />
      </label>

      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="text-[12px] font-semibold">Optional context for setup</div>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
          Helps Intera prepare your account — not published automatically.
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[11px] text-[var(--muted)]">Studies you&apos;re seeking</span>
            <textarea
              value={seeking}
              onChange={(e) => setSeeking(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px]"
              placeholder="e.g. Phase 3 obesity / T2D…"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-[var(--muted)]">Current capacity</span>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
              placeholder="e.g. 2 Phase 3 slots open"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={wantIntera}
              onChange={(e) => setWantIntera(e.target.checked)}
            />
            Interested in TryIntera recruitment help
          </label>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Link href="/join" className="text-[12px] text-[var(--muted)] underline">
          Back
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Request account setup"}
        </button>
      </div>

      <p className="text-[12px] text-[var(--muted)]">
        Don&apos;t see your site?{" "}
        <Link href="/join/new-site" className="font-medium text-[var(--accent)] underline">
          Request a new Atlas profile
        </Link>
      </p>
    </form>
  );
}
