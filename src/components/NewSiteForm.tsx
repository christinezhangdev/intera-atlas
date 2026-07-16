"use client";

import Link from "next/link";
import { useState } from "react";

export function NewSiteForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ workEmail: string; orgName: string } | null>(null);
  const [workEmail, setWorkEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");
  const [hq, setHq] = useState("");
  const [siteType, setSiteType] = useState("Site Network");
  const [geography, setGeography] = useState("");
  const [message, setMessage] = useState("");
  const [seeking, setSeeking] = useState("");
  const [wantIntera, setWantIntera] = useState(false);

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
          createNew: true,
          workEmail,
          orgName,
          website,
          hq,
          siteType,
          geography,
          message,
          sitePrivate: {
            seekingStudies: seeking,
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
          <span className="font-medium text-emerald-950">{done.orgName}</span> and create your
          Atlas profile once approved.
        </p>
        <Link href="/" className="mt-5 inline-block text-[13px] font-medium text-[var(--accent)]">
          Back to Atlas →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-[12px] text-[var(--muted)]">
        Request a new organization profile. Your{" "}
        <span className="text-[var(--ink)]">company work email domain must match your website</span>
        . Intera will contact you to set up the account — nothing goes live automatically.
      </p>
      {error ? <p className="text-[12px] text-amber-700">{error}</p> : null}

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Work email</span>
        <input
          required
          type="email"
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] outline-none focus:border-[var(--accent)]"
          placeholder="you@yourcompany.com"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Organization name</span>
        <input
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
          placeholder="Acme Clinical Research"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Company website</span>
        <input
          required
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
          placeholder="https://yourcompany.com"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] text-[var(--muted)]">HQ / city</span>
          <input
            value={hq}
            onChange={(e) => setHq(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
            placeholder="Durham, NC"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-[var(--muted)]">Type</span>
          <select
            value={siteType}
            onChange={(e) => setSiteType(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
          >
            <option>Site Network</option>
            <option>Independent Site</option>
            <option>Academic Network</option>
            <option>SMO</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">States / geography</span>
        <input
          value={geography}
          onChange={(e) => setGeography(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
          placeholder="North Carolina, Florida, Texas"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Message to Intera (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px]"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Studies you&apos;re seeking (optional)</span>
        <textarea
          value={seeking}
          onChange={(e) => setSeeking(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px]"
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

      <div className="flex flex-wrap justify-between gap-2">
        <Link href="/sites" className="text-[12px] text-[var(--muted)] underline">
          Back to sites
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Request new profile"}
        </button>
      </div>
    </form>
  );
}
