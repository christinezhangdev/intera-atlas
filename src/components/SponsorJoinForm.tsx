"use client";

import Link from "next/link";
import { useState } from "react";

export function SponsorJoinForm({
  defaultName = "",
  defaultDomain = "",
  role = "sponsor" as "sponsor" | "cro",
}: {
  defaultName?: string;
  defaultDomain?: string;
  role?: "sponsor" | "cro";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ workEmail: string; orgName: string } | null>(null);
  const [workEmail, setWorkEmail] = useState(
    defaultDomain ? `you@${defaultDomain}` : "",
  );
  const [orgName, setOrgName] = useState(defaultName);
  const [message, setMessage] = useState("");
  const [therapeuticFocus, setTherapeuticFocus] = useState("");
  const [protocols, setProtocols] = useState("");
  const [geo, setGeo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          workEmail,
          orgName,
          message,
          sponsorPrivate: {
            therapeuticFocus,
            protocolsUnderConsideration: protocols,
            geographyPrefs: geo,
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
          Atlas account.
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
        email so we can contact you to set up access.
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
          placeholder={role === "cro" ? "you@iqvia.com" : "sarah@lilly.com"}
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">Organization name</span>
        <input
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">What should we know? (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px]"
          placeholder="Team role, upcoming protocols, timeline…"
        />
      </label>

      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="text-[12px] font-semibold">Optional context for setup</div>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[11px] text-[var(--muted)]">Therapeutic focus</span>
            <input
              value={therapeuticFocus}
              onChange={(e) => setTherapeuticFocus(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
              placeholder="Obesity, cardiometabolic, oncology…"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-[var(--muted)]">Protocols under consideration</span>
            <textarea
              value={protocols}
              onChange={(e) => setProtocols(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-[var(--muted)]">Geography preferences</span>
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px]"
              placeholder="Texas, Florida, Southeast…"
            />
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
    </form>
  );
}
