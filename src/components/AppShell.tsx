"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AtlasMark } from "@/components/AtlasMark";
import { InteraFamilyFooter } from "@/components/InteraFamilyFooter";

const PRIMARY = [
  {
    href: "/",
    label: "Rank",
    match: (p: string) => p === "/" || p.startsWith("/r/") || p.startsWith("/protocols"),
  },
  {
    href: "/sites",
    label: "Network",
    match: (p: string) => p.startsWith("/sites"),
  },
  {
    href: "/search",
    label: "Search",
    match: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/join",
    label: "Claim",
    match: (p: string) => p.startsWith("/join") || p.startsWith("/dashboard"),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-[14px] font-semibold tracking-tight"
            >
              <AtlasMark size={26} />
              <span className="hidden sm:inline">Intera Atlas</span>
            </Link>
            <nav className="flex items-center gap-0.5 overflow-x-auto">
              {PRIMARY.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] ${
                      active
                        ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={onHome ? "#rank" : "/"}
              className="inline-flex h-8 items-center rounded-md bg-[var(--accent)] px-3 text-[12px] font-medium text-white hover:opacity-90"
            >
              Run match
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <InteraFamilyFooter />
    </div>
  );
}
