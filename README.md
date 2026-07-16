# Intera Atlas

Intelligence layer for clinical research site selection.

**One question:** Given this protocol, where should this study run?

## Stack

- Next.js App Router
- Site Graph from `US_Clinical_Site_Networks_Database.csv` (822 orgs)
- Quality Scorecard five scores (CSV-published when present; else computed)
- Model v2–aligned ranking + Intera Liftability

## Develop

```bash
npm run ingest   # CSV → data/sites.json + quality scores
npm run dev      # http://localhost:3000
```

Copy `.env.example` → `.env.local`. For durable org claims (required on Vercel), set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` and run `supabase/migrations/001_org_claims.sql` in the Supabase SQL editor. Without those env vars, claims fall back to local `data/org-claims.json`.

## Surfaces

| Route | Purpose |
|---|---|
| `/` | Home — lift opportunities + top quality |
| `/sites` | Site Explorer |
| `/sites/[id]` | Canonical Site Profile |
| `/protocols/new` | Protocol upload → rank |
| `/r/[id]` | Recommendation results |
| `/search` | Bloomberg-style search |
| `/graph` | Relationship paths |
| `/map` | State coverage |
| `/analytics` | Score / type / ICP modules |

⌘K opens command palette.

## Data honesty

CURRENT = public CSV + CT.gov/web-derived scores.  
FUTURE MOAT = funnel→randomization, consented patients, true accrual, measured SSU.
