import fs from "fs";
import path from "path";
import type { OrgRole } from "@/lib/org-types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type ClaimRequestStatus = "submitted" | "contacted" | "approved" | "declined";

export type ClaimRequest = {
  id: string;
  role: OrgRole;
  workEmail: string;
  emailDomain: string;
  orgName: string;
  linkedSiteId?: string;
  website?: string;
  createNew?: boolean;
  hq?: string;
  siteType?: string;
  geography?: string;
  message?: string;
  notes?: Record<string, unknown>;
  status: ClaimRequestStatus;
  createdAt: string;
};

type DbRow = {
  id: string;
  role: OrgRole;
  work_email: string;
  email_domain: string;
  org_name: string;
  linked_site_id: string | null;
  website: string | null;
  create_new: boolean;
  hq: string | null;
  site_type: string | null;
  geography: string | null;
  message: string | null;
  notes: Record<string, unknown> | null;
  status: ClaimRequestStatus;
  created_at: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "claim-requests.json");

function rowToRequest(row: DbRow): ClaimRequest {
  return {
    id: row.id,
    role: row.role,
    workEmail: row.work_email,
    emailDomain: row.email_domain,
    orgName: row.org_name,
    linkedSiteId: row.linked_site_id || undefined,
    website: row.website || undefined,
    createNew: row.create_new || undefined,
    hq: row.hq || undefined,
    siteType: row.site_type || undefined,
    geography: row.geography || undefined,
    message: row.message || undefined,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

function requestToRow(r: ClaimRequest): DbRow {
  return {
    id: r.id,
    role: r.role,
    work_email: r.workEmail,
    email_domain: r.emailDomain,
    org_name: r.orgName,
    linked_site_id: r.linkedSiteId ?? null,
    website: r.website ?? null,
    create_new: Boolean(r.createNew),
    hq: r.hq ?? null,
    site_type: r.siteType ?? null,
    geography: r.geography ?? null,
    message: r.message ?? null,
    notes: r.notes ?? null,
    status: r.status,
    created_at: r.createdAt,
  };
}

function readFileStore(): ClaimRequest[] {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as ClaimRequest[];
  } catch {
    return [];
  }
}

function writeFileStore(rows: ClaimRequest[]) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(rows, null, 2), "utf8");
}

export async function insertClaimRequest(req: ClaimRequest): Promise<ClaimRequest> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("claim_requests")
      .insert(requestToRow(req))
      .select("*")
      .single();
    if (!error && data) return rowToRequest(data as DbRow);
    console.error("Supabase insert claim_requests failed:", error?.message);
    // Fall through to file store if table missing / misconfigured
  }

  const rows = readFileStore();
  rows.push(req);
  writeFileStore(rows);
  return req;
}
