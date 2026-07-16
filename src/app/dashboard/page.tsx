import { Suspense } from "react";
import { OrgDashboard } from "@/components/OrgDashboard";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Suspense fallback={<p className="text-[12px] text-[var(--muted)]">Loading workspace…</p>}>
        <OrgDashboard />
      </Suspense>
    </div>
  );
}
