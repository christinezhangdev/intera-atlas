import { NextResponse } from "next/server";
import {
  emailMatchesOfficial,
  isBlockedClaimEmailDomain,
  primaryOfficialDomain,
  resolveSiteOrg,
} from "@/lib/claim-verify";
import { websiteMatchesEmailDomain } from "@/lib/created-sites";
import { insertClaimRequest, type ClaimRequest } from "@/lib/claim-requests";
import { notifyClaimRequest } from "@/lib/notify-claim";
import {
  emailDomain,
  isConsumerEmailDomain,
  type OrgRole,
} from "@/lib/org-types";
import { guessSponsorDomain } from "@/lib/sponsors";

export const runtime = "nodejs";

/**
 * Claim / account setup request — does NOT auto-create a live claim.
 * Stores the request for Intera review and emails the team to contact the submitter.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      role?: OrgRole;
      workEmail?: string;
      orgName?: string;
      linkedSiteId?: string;
      createNew?: boolean;
      website?: string;
      hq?: string;
      siteType?: string;
      geography?: string;
      message?: string;
      notes?: Record<string, unknown>;
      sitePrivate?: Record<string, unknown>;
      sponsorPrivate?: Record<string, unknown>;
      publicBio?: string;
    };

    const role = body.role;
    const workEmail = (body.workEmail || "").trim().toLowerCase();
    if (!role || !["site", "sponsor", "cro"].includes(role)) {
      return NextResponse.json({ error: "role required: site | sponsor | cro" }, { status: 400 });
    }
    if (!workEmail.includes("@")) {
      return NextResponse.json({ error: "Work email required" }, { status: 400 });
    }

    const domain = emailDomain(workEmail);
    if (!domain) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (isConsumerEmailDomain(domain)) {
      return NextResponse.json(
        {
          error:
            "Use your company work email (not Gmail/Yahoo/etc.). Intera will contact you at that address to set up the account.",
        },
        { status: 400 },
      );
    }

    let orgName = (body.orgName || "").trim();
    let linkedSiteId = body.linkedSiteId;
    let website = (body.website || "").trim();
    const createNew = Boolean(body.createNew);
    const hq = (body.hq || "").trim();
    const siteType = (body.siteType || "").trim();
    const geography = (body.geography || "").trim();
    const message = (body.message || "").trim();

    if (role === "site") {
      const resolved = resolveSiteOrg({ linkedSiteId, orgName });

      if (resolved && !createNew) {
        const { site, officialDomains } = resolved;
        linkedSiteId = site.id;
        orgName = site.name;
        const primary = primaryOfficialDomain(officialDomains);

        if (officialDomains.length) {
          if (isBlockedClaimEmailDomain(domain) && !officialDomains.some((d) => d.endsWith(".edu"))) {
            return NextResponse.json(
              {
                error: `Personal or academic emails (@${domain}) can’t claim ${site.name}. Use an official company email${primary ? ` such as @${primary}` : ""}.`,
                expectedDomain: primary,
                officialDomains,
              },
              { status: 403 },
            );
          }
          if (!emailMatchesOfficial(domain, officialDomains)) {
            return NextResponse.json(
              {
                error: `Email @${domain} does not match ${site.name}’s official domain${primary ? ` (@${primary})` : ""}. Use your company work email so we can verify and set up your account.`,
                expectedDomain: primary,
                officialDomains,
              },
              { status: 403 },
            );
          }
        }
      } else if (createNew) {
        if (!orgName) {
          return NextResponse.json({ error: "Organization name required" }, { status: 400 });
        }
        if (!website) {
          return NextResponse.json(
            { error: "Company website is required so we can verify you before creating a profile." },
            { status: 400 },
          );
        }
        if (isBlockedClaimEmailDomain(domain)) {
          return NextResponse.json(
            {
              error: `Personal or academic emails (@${domain}) can’t create a commercial site profile. Use your company work email.`,
            },
            { status: 403 },
          );
        }
        const webMatch = websiteMatchesEmailDomain(website, workEmail);
        if (!webMatch.ok) {
          return NextResponse.json(
            {
              error: `Your work email (@${domain}) must match your company website domain${webMatch.webDomain ? ` (@${webMatch.webDomain})` : ""}. We’ll use that address to contact you and set up the account.`,
            },
            { status: 403 },
          );
        }
      } else if (!orgName) {
        return NextResponse.json({ error: "Organization name required" }, { status: 400 });
      }
    } else {
      // sponsor / cro
      if (!orgName) {
        return NextResponse.json({ error: "Organization name required" }, { status: 400 });
      }
      if (isBlockedClaimEmailDomain(domain)) {
        return NextResponse.json(
          {
            error: `Use your company work email to request a ${role} account (not @${domain}).`,
          },
          { status: 403 },
        );
      }
      const guessed = guessSponsorDomain(orgName);
      if (guessed && domain !== guessed && !domain.endsWith(`.${guessed}`)) {
        // Soft warn only for sponsors — still accept if domain is clearly commercial
        // Hard-block only when it's a glaring consumer/academic domain (already handled)
      }
    }

    const notes: Record<string, unknown> = {
      ...(body.notes || {}),
      ...(body.publicBio ? { publicBio: body.publicBio } : {}),
      ...(body.sitePrivate || {}),
      ...(body.sponsorPrivate || {}),
    };

    const request: ClaimRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      workEmail,
      emailDomain: domain,
      orgName,
      linkedSiteId,
      website: website || undefined,
      createNew: createNew || undefined,
      hq: hq || undefined,
      siteType: siteType || undefined,
      geography: geography || undefined,
      message: message || undefined,
      notes: Object.keys(notes).length ? notes : undefined,
      status: "submitted",
      createdAt: new Date().toISOString(),
    };

    const saved = await insertClaimRequest(request);
    const notify = await notifyClaimRequest(saved);

    return NextResponse.json({
      ok: true,
      request: {
        id: saved.id,
        orgName: saved.orgName,
        workEmail: saved.workEmail,
        role: saved.role,
        status: saved.status,
      },
      emailed: notify.emailed,
      message:
        "Thanks — your request was submitted. Intera will contact you at your work email to verify your organization and set up your Atlas account.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not submit claim request" }, { status: 500 });
  }
}
