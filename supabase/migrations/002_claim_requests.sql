-- Claim / account setup requests — Intera reviews and contacts the submitter.
-- Run in Supabase SQL Editor after 001_org_claims.sql

create table if not exists public.claim_requests (
  id text primary key,
  role text not null check (role in ('site', 'sponsor', 'cro')),
  work_email text not null,
  email_domain text not null,
  org_name text not null,
  linked_site_id text,
  website text,
  create_new boolean not null default false,
  hq text,
  site_type text,
  geography text,
  message text,
  notes jsonb,
  status text not null default 'submitted'
    check (status in ('submitted', 'contacted', 'approved', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists claim_requests_created_at_idx
  on public.claim_requests (created_at desc);

create index if not exists claim_requests_status_idx
  on public.claim_requests (status);

alter table public.claim_requests enable row level security;
