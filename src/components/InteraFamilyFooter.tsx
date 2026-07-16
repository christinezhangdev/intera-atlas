"use client";

import Link from "next/link";
import { AtlasMark } from "@/components/AtlasMark";
import { TrialPathMark } from "@/components/TrialPathMark";
import { TryInteraMark } from "@/components/TryInteraMark";

/**
 * Intera product map:
 *   tryintera.com        → company / thesis / products
 *   atlas.tryintera.com  → site graph, sponsor profiles, protocol matching
 *   thetrialpath.com     → patients finding trials
 */
const FAMILY = [
  {
    name: "Atlas",
    href: "/",
    domain: "atlas.tryintera.com",
    line: "Site graph, sponsor profiles, and protocol matching.",
    external: false,
    current: true,
    mark: "atlas" as const,
  },
  {
    name: "TrialPath",
    href: "https://thetrialpath.com",
    domain: "thetrialpath.com",
    line: "Patients finding trials.",
    external: true,
    current: false,
    mark: "trialpath" as const,
  },
  {
    name: "TryIntera",
    href: "https://tryintera.com",
    domain: "tryintera.com",
    line: "Company, thesis, and products.",
    external: true,
    current: false,
    mark: "tryintera" as const,
  },
] as const;

function ProductMark({ mark }: { mark: "trialpath" | "tryintera" | "atlas" }) {
  if (mark === "trialpath") return <TrialPathMark size={28} />;
  if (mark === "tryintera") return <TryInteraMark size={28} />;
  return <AtlasMark size={28} />;
}

export function InteraFamilyFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--line)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(37,99,235,0.07),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_72%)]"
      />

      <div className="relative mx-auto max-w-5xl px-5 py-14 sm:py-16">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a
              href="https://tryintera.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-block"
            >
              <p className="font-mono text-[11px] font-medium tracking-[0.22em] text-[var(--accent)] transition-opacity group-hover:opacity-80">
                INTERA
              </p>
              <p className="mt-1 font-mono text-[11px] text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]">
                tryintera.com
              </p>
            </a>
            <p className="mt-3 max-w-sm text-[26px] font-semibold leading-[1.15] tracking-tight text-[var(--ink)] sm:text-[30px]">
              Healthcare should move at the speed of care.
            </p>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">
              Company, thesis, and products.
            </p>
          </div>
          <p className="max-w-xs text-[12px] leading-relaxed text-[var(--muted)] sm:text-right">
            Patient demand · site selection · recruitment coordination — one pipeline.
          </p>
        </div>

        <div className="mt-12 grid gap-0 border-y border-[var(--line)] sm:grid-cols-3">
          {FAMILY.map((item, i) => {
            const className = [
              "group relative flex min-h-[168px] flex-col justify-between gap-6 px-0 py-8 transition-colors sm:px-6",
              i > 0 ? "border-t border-[var(--line)] sm:border-t-0 sm:border-l" : "",
              item.current
                ? "bg-[var(--accent-soft)]/40 sm:-mx-px sm:border-l-[var(--accent)]/25"
                : "hover:bg-white/70",
            ].join(" ");

            const body = (
              <>
                <div>
                  <div className="flex items-center gap-2.5">
                    <ProductMark mark={item.mark} />
                    <h3 className="text-[16px] font-semibold tracking-tight text-[var(--ink)]">
                      {item.name}
                    </h3>
                    {item.current ? (
                      <span className="rounded-sm bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                        Here
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]">
                    {item.domain}
                  </p>
                  <p className="mt-4 max-w-[220px] text-[13px] leading-relaxed text-[var(--muted)]">
                    {item.line}
                  </p>
                </div>
                <span
                  className={[
                    "inline-flex items-center gap-1.5 text-[12px] font-medium",
                    item.current
                      ? "text-[var(--accent)]"
                      : "text-[var(--ink)]/50 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--accent)]",
                  ].join(" ")}
                >
                  {item.current ? "You are here" : "Open"}
                  <span aria-hidden className="text-[14px] leading-none">
                    →
                  </span>
                </span>
              </>
            );

            if (item.external) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {body}
                </a>
              );
            }

            return (
              <Link key={item.name} href={item.href} className={className}>
                {body}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/sites" className="transition-colors hover:text-[var(--ink)]">
              Explore network
            </Link>
            <Link href="/join" className="transition-colors hover:text-[var(--ink)]">
              Claim organization
            </Link>
            <Link href="/#how-it-works" className="transition-colors hover:text-[var(--ink)]">
              How Atlas works
            </Link>
          </div>
          <span>Observed data, not self-report</span>
        </div>
      </div>
    </footer>
  );
}
