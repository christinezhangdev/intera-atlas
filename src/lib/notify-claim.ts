import type { ClaimRequest } from "@/lib/claim-requests";

export function claimRequestNotifyTo(): string {
  return (
    process.env.CLAIM_REQUEST_TO?.trim() ||
    "christine_zhang@college.harvard.edu"
  );
}

/**
 * Email Intera that a claim/account setup request arrived.
 * Uses Resend when RESEND_API_KEY is set; otherwise skips send (request is still stored).
 */
export async function notifyClaimRequest(req: ClaimRequest): Promise<{ emailed: boolean; error?: string }> {
  const to = claimRequestNotifyTo();
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() || "Intera Atlas <onboarding@resend.dev>";

  const subject = `[Atlas] Claim request — ${req.orgName} (${req.role})`;
  const lines = [
    `New organization claim / account setup request`,
    ``,
    `Org: ${req.orgName}`,
    `Role: ${req.role}`,
    `Work email: ${req.workEmail}`,
    `Domain: @${req.emailDomain}`,
    req.linkedSiteId ? `Linked site id: ${req.linkedSiteId}` : null,
    req.website ? `Website: ${req.website}` : null,
    req.createNew ? `Wants new Atlas profile: yes` : null,
    req.hq ? `HQ: ${req.hq}` : null,
    req.geography ? `Geography: ${req.geography}` : null,
    req.message ? `\nMessage:\n${req.message}` : null,
    req.notes && Object.keys(req.notes).length
      ? `\nNotes:\n${JSON.stringify(req.notes, null, 2)}`
      : null,
    `\nRequest id: ${req.id}`,
    `Submitted: ${req.createdAt}`,
    ``,
    `Reply to ${req.workEmail} to set up their account.`,
  ].filter((x) => x != null);

  const text = lines.join("\n");

  if (!key) {
    console.warn(
      "RESEND_API_KEY not set — claim request stored but email not sent.",
      { to, subject, workEmail: req.workEmail },
    );
    return { emailed: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: req.workEmail,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Resend failed:", res.status, body);
      return { emailed: false, error: body.slice(0, 200) };
    }
    return { emailed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "email failed";
    console.error("Resend error:", msg);
    return { emailed: false, error: msg };
  }
}
