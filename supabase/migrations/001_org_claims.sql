create table if not exists public.org_claims (
  id text primary key,
  role text not null check (role in ('site', 'sponsor', 'cro')),
  linked_site_id text,
  created_new boolean not null default false,
  org_name text not null,
  domain text not null,
  work_email text not null,
  status text not null default 'pending'
    check (status in ('unclaimed', 'pending', 'verified')),
  created_at timestamptz not null default now(),
  public_bio text,
  public_tech text,
  website text,
  hq text,
  site_type text,
  geography text,
  site_private jsonb,
  sponsor_private jsonb
);

create index if not exists org_claims_linked_site_id_idx
  on public.org_claims (linked_site_id);

create index if not exists org_claims_status_idx
  on public.org_claims (status);

create index if not exists org_claims_created_new_idx
  on public.org_claims (created_new)
  where created_new = true;

alter table public.org_claims enable row level security;
