# Event Submissions + Voting (Next.js + Supabase)

A simple event submission board with upvoting. Submissions arrive via a webhook, votes are limited to one per authenticated email using Supabase magic links + RLS.

## Features
- Webhook endpoint to ingest submissions (`/api/webhook`)
- Public list sorted by vote count
- Magic link auth via Supabase
- RLS enforced one-vote-per-user

## Setup

### 1) Supabase project
1. Create a new Supabase project.
2. Open the SQL editor and run `supabase.sql`.
3. Run `supabase/bot-keys-encryption.sql` to enable encrypted bot keys.
3. In **Authentication → Providers**, enable **Email** (magic link).
4. Add your site URL (local + production) to **Authentication → URL Configuration**.

### 2) Environment variables
Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
- `BOT_KEY_ENC_KEY` (32-byte secret or longer input for HKDF derivation)
- `BOT_KEY_ENC_KEY_VERSION` (optional, default `1`)

### 3) Install + run
```bash
npm install
npm run dev
```

## Webhook usage
Send a POST request to `/api/webhook` with JSON:
```json
{
  "title": "Scaling Payments at Sunrise",
  "description": "Lessons learned shipping reliable billing pipelines.",
  "presenter_name": "Jamie Rivera",
  "links": ["https://example.com/slides"]
}
```

Example curl:
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"title":"Scaling Payments","description":"Lessons...","presenter_name":"Jamie Rivera","links":["https://example.com"]}'
```

## Vercel deployment
1. Push the repo to GitHub.
2. Create a new Vercel project from the repo.
3. Add the same env vars in Vercel **Project Settings → Environment Variables**.
4. Deploy.

## Notes
- Votes are enforced with a unique constraint on `(submission_id, user_id)`.
- The list UI uses an RPC function (`get_submissions_with_votes`) to return vote counts without exposing vote rows.
