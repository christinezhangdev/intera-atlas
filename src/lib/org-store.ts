import fs from "fs";
import path from "path";
import type { OrgClaim, OrgStoreFile } from "@/lib/org-types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const STORE_PATH = path.join(process.cwd(), "data", "org-claims.json");

type DbRow = {
  id: string;
  role: OrgClaim["role"];
  linked_site_id: string | null;
  created_new: boolean;
  org_name: string;
  domain: string;
  work_email: string;
  status: OrgClaim["status"];
  created_at: string;
  public_bio: string | null;
  public_tech: string | null;
  website: string | null;
  hq: string | null;
  site_type: string | null;
  geography: string | null;
  site_private: OrgClaim["sitePrivate"] | null;
  sponsor_private: OrgClaim["sponsorPrivate"] | null;
};

function empty(): OrgStoreFile {
  return { claims: [] };
}

function rowToClaim(row: DbRow): OrgClaim {
  return {
    id: row.id,
    role: row.role,
    linkedSiteId: row.linked_site_id || undefined,
    createdNew: row.created_new || undefined,
    orgName: row.org_name,
    domain: row.domain,
    workEmail: row.work_email,
    status: row.status,
    createdAt: row.created_at,
    publicBio: row.public_bio || undefined,
    publicTech: row.public_tech || undefined,
    website: row.website || undefined,
    hq: row.hq || undefined,
    siteType: row.site_type || undefined,
    geography: row.geography || undefined,
    sitePrivate: row.site_private || undefined,
    sponsorPrivate: row.sponsor_private || undefined,
  };
}

function claimToRow(claim: OrgClaim): DbRow {
  return {
    id: claim.id,
    role: claim.role,
    linked_site_id: claim.linkedSiteId ?? null,
    created_new: Boolean(claim.createdNew),
    org_name: claim.orgName,
    domain: claim.domain,
    work_email: claim.workEmail,
    status: claim.status,
    created_at: claim.createdAt,
    public_bio: claim.publicBio ?? null,
    public_tech: claim.publicTech ?? null,
    website: claim.website ?? null,
    hq: claim.hq ?? null,
    site_type: claim.siteType ?? null,
    geography: claim.geography ?? null,
    site_private: claim.sitePrivate ?? null,
    sponsor_private: claim.sponsorPrivate ?? null,
  };
}

function readFileStore(): OrgStoreFile {
  try {
    if (!fs.existsSync(STORE_PATH)) return empty();
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw) as OrgStoreFile;
  } catch {
    return empty();
  }
}

function writeFileStore(store: OrgStoreFile) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function listFromSupabase(): Promise<OrgClaim[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb.from("org_claims").select("*").order("created_at", {
    ascending: true,
  });
  if (error) {
    console.error("Supabase list org_claims failed:", error.message);
    throw error;
  }
  return (data as DbRow[] | null)?.map(rowToClaim) ?? [];
}

export async function listClaims(): Promise<OrgClaim[]> {
  if (isSupabaseConfigured()) return listFromSupabase();
  return readFileStore().claims;
}

export async function getClaimById(id: string): Promise<OrgClaim | undefined> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb.from("org_claims").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("Supabase getClaimById failed:", error.message);
      throw error;
    }
    return data ? rowToClaim(data as DbRow) : undefined;
  }
  return readFileStore().claims.find((c) => c.id === id);
}

export async function getClaimBySiteId(siteId: string): Promise<OrgClaim | undefined> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("org_claims")
      .select("*")
      .eq("linked_site_id", siteId)
      .in("status", ["pending", "verified"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("Supabase getClaimBySiteId failed:", error.message);
      throw error;
    }
    return data ? rowToClaim(data as DbRow) : undefined;
  }
  return readFileStore().claims.find(
    (c) => c.linkedSiteId === siteId && (c.status === "pending" || c.status === "verified"),
  );
}

export async function upsertClaim(claim: OrgClaim): Promise<OrgClaim> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("org_claims")
      .upsert(claimToRow(claim), { onConflict: "id" })
      .select("*")
      .single();
    if (error) {
      console.error("Supabase upsertClaim failed:", error.message);
      throw error;
    }
    return rowToClaim(data as DbRow);
  }

  const store = readFileStore();
  const idx = store.claims.findIndex((c) => c.id === claim.id);
  if (idx >= 0) store.claims[idx] = claim;
  else store.claims.push(claim);
  writeFileStore(store);
  return claim;
}

/** Site orgs created because they weren’t already in Atlas. */
export async function listCreatedSiteClaims(): Promise<OrgClaim[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("org_claims")
      .select("*")
      .eq("role", "site")
      .eq("created_new", true)
      .not("linked_site_id", "is", null);
    if (error) {
      console.error("Supabase listCreatedSiteClaims failed:", error.message);
      throw error;
    }
    return (data as DbRow[] | null)?.map(rowToClaim) ?? [];
  }
  return readFileStore().claims.filter(
    (c) => c.role === "site" && c.createdNew && Boolean(c.linkedSiteId),
  );
}

/** Map linkedSiteId → claim for matching boosts (avoids N+1). */
export async function claimsByLinkedSiteId(): Promise<Map<string, OrgClaim>> {
  const claims = await listClaims();
  const map = new Map<string, OrgClaim>();
  for (const c of claims) {
    if (!c.linkedSiteId) continue;
    if (c.status !== "pending" && c.status !== "verified") continue;
    const prev = map.get(c.linkedSiteId);
    if (!prev || c.createdAt >= prev.createdAt) map.set(c.linkedSiteId, c);
  }
  return map;
}
