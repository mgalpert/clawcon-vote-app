# ClawCon in OpenClaw Gateway — PRD (Fork + Rebuild)

Last updated: 2026-02-07

This PRD describes how to rebuild the ClawCon “submit + vote” experience **inside a fork of OpenClaw**, by upgrading/extending the **OpenClaw Gateway Dashboard UI**.

Instead of a standalone Next.js site, ClawCon becomes a set of **Gateway dashboard views** reachable from the left sidebar. Each ClawCon section is a first-class **`nav-item`** alongside existing Gateway sections.

The goal is to preserve the current functional behavior (submissions, voting, comments, bot submissions, public read-only logs) while adopting the Gateway dashboard layout, theme, and navigation model.

---

## 1) Product summary

### Purpose
A lightweight, public website where attendees can:
- Browse **demos** and **topics** (and other categories)
- Submit new entries (requires sign-in)
- Vote on entries (requires sign-in)
- Discuss entries via comments (requires sign-in)
- Browse related resources (events, speakers, chats, photos, etc.)
- Expose limited “ops” visibility via **public, read-only logs**

### Audience
- Public visitors (read-only)
- Authenticated attendees (submit/vote/comment)
- Bot integrators (submit on behalf via API key)

### Non-goals (current)
- Moderation UI
- Admin dashboard
- Paid accounts
- Complex permissions / roles

---

## 2) Tech stack + architecture

### Frontend (OpenClaw Gateway Dashboard fork)
- Use the existing **OpenClaw Gateway dashboard** app shell:
  - Left sidebar navigation groups
  - `nav-item` links
  - Topbar chrome + theme system
- Add a new sidebar group (or extend an existing group) named **ClawCon** with nav-items:
  - **Demos** (nav-item)
  - **Topics** (nav-item)
  - **Speakers** (nav-item)
  - **Sponsors** (nav-item)
  - (optional parity items: Events, Robots, Papers, Awards, Jobs, Photos, Livestream, Memes, Chats, Worldwide, Logs)

Implementation detail (UI):
- Each section is a routed **dashboard view** (panel/page) consistent with the Gateway UI.
- Match Gateway tokens/typography/radius/shadows; do not reintroduce HN CSS.

### Backend
Primary backend remains **Supabase Postgres** (same schema + RPC approach), unless replaced.

- Supabase Postgres
- Supabase Auth (magic link / OTP) *or* OpenClaw/Gateway auth bridging (decision)
- Privileged server actions run from the Gateway backend/runtime (not Next.js route handlers):
  - bot key reveal/regenerate (service role)
  - webhook submission (service role)
  - ClawHub sync (service role)

### Key design pattern
- Anonymous/public browsing uses **security definer RPCs** and/or RLS policies that explicitly allow safe reads.
- Writes (submissions/votes/comments) require authenticated identity.

### Open questions / decisions for the fork
- Where will the dashboard run (local-only, hosted, or both)?
- What is the auth model?
  - Option A: keep Supabase OTP auth inside the dashboard
  - Option B: map Gateway identity → Supabase user (SSO-like)

---

## 3) Domain model

### City
A “city” is a UI filter that selects which event slug to use for scoped queries.

Source: `lib/cities.ts`
- Supported city keys: `san-francisco | denver | tokyo | kona`
- Each city has:
  - `label`, `shortLabel`
  - `eventSlug` (maps to `events.slug`)
  - optional `eventPageUrl`, `livestreamUrl`, etc.

Routing convention:
- Most pages carry a `?city=<cityKey>` query param.

### Submission
Type: `lib/types.ts::Submission`
- Core: `id, event_id, title, description, presenter_name, links[]`
- Category: `submission_type` in:
  - `speaker_demo | topic | robot | paper | sponsor | award | job | livestream | skill | meme | chat`
- Meta:
  - `submitted_by: human | bot | bot_on_behalf`
  - `submitted_for_name` (for bot_on_behalf)
  - `vote_count` (computed)
  - `comment_count` (computed when comments migration applied)
  - `created_at`

### Vote
- Unique per `(submission_id, user_id)`

### Comments
Comments are defined in separate SQL migrations under `supabase/` and used by `/post/[id]`.

### Bot keys
Encrypted API keys associated with a user (used for webhook submissions).

---

## 4) Database schema, policies, and functions

Primary schema file in repo root:
- `supabase.sql`

Additional migrations in `supabase/`:
- `add-comments.sql`
- `complete-setup.sql` (comments + PII-safe views + comment_count RPC updates)
- `bot-keys-encryption.sql`
- `security-fix.sql`
- `clawcon-events.sql`

### 4.1 Tables (base)
From `supabase.sql`:
- `public.events`
- `public.submissions`
- `public.votes`
- `public.bot_keys`
- `public.bot_key_audit`

From `supabase/complete-setup.sql`:
- `public.comments`
- `public_comments` view
- `public_submissions` view

### 4.2 RLS policies (core expectations)
- `events`: public select
- `submissions`: public select; authenticated insert
- `votes`: authenticated insert; authenticated read-own votes
- `bot_keys` + `bot_key_audit`: no direct access (all denied)
- `comments`: public select; authenticated insert/delete own

### 4.3 RPCs / functions
#### A) `get_submissions_with_votes()` (legacy)
Returns submissions with computed `vote_count`.
Granted to `anon, authenticated`.

#### B) `get_submissions_with_votes(_event_slug text)` (event-scoped)
Returns only submissions whose `event_id` joins an `events.slug`.
Granted to `anon, authenticated`.

#### C) Public logs RPCs (added for /logs)
From `supabase.sql`:
- `get_public_recent_submissions(_event_slug text, _limit int default 200)`
  - Returns: `id, created_at, title, presenter_name, submission_type`
- `get_public_recent_votes(_event_slug text, _limit int default 200)`
  - Returns: `id, created_at, submission_id`

Both are `security definer` and granted to `anon, authenticated`.

#### D) Bot key public view
- `get_bot_key_public(_user_id uuid)` + `bot_keys_public` view
- Allows logged-in user to see (only) `last4, created_at, updated_at`

---

## 5) Dashboard views (routes) and behavior

In the OpenClaw fork, these are **Gateway dashboard routes/views** (not Next.js `app/**/page.tsx`). The view names below are functional equivalents.

### 5.1 ClawCon → Demos (nav-item)
**Dashboard route:** `/clawcon/demos` (suggested)

Functional equivalent of the old Home page’s “demos” tab.

Key behaviors:
- City context is taken from the Gateway’s global selector/state (or URL param). Default: `DEFAULT_CITY_KEY`.
- Resolve `eventId` by `events.slug = city.eventSlug`.
- Fetch submissions via RPC:
  - prefer `get_submissions_with_votes(_event_slug)`
  - fallback to legacy `get_submissions_with_votes()`
- Sort/pin behavior (parity):
  1) GitHub link present (boost)
  2) vote_count desc
- Filter to `submission_type = speaker_demo`.
- Pagination/infinite scroll optional (keep if easy).

Auth:
- If unauthenticated: show “Sign in to vote/submit” (use existing Gateway auth UX if available, or Supabase OTP modal).
- Vote: insert into `votes`.
- Submit: insert into `submissions` with `event_id`.

Bot key management (optional placement):
- Either keep in a “Bot API” card within Demos, or move to a separate Gateway settings panel.
- Reveal/regenerate are privileged operations.

### 5.2 ClawCon → Topics (nav-item)
**Dashboard route:** `/clawcon/topics`

Same as Demos, but filter `submission_type = topic` and adjust submission form fields.

### 5.3 ClawCon → Item detail (shared)
**Dashboard route:** `/clawcon/item/:id` (suggested)

Functional equivalent of `/post/[id]`.

Behaviors:
- Fetch submission: use the `get_submissions_with_votes` RPC and select by `id`.
- Fetch comments: select from `comments` (expects migration applied).
- Vote: insert into `votes`.
- Comment: insert into `comments`.
- If unauthenticated, prompt sign-in.

### 5.5 ClawCon → Sponsors (nav-item)
**Dashboard route:** `/clawcon/sponsors`

Behaviors (parity):
- Submission type: `sponsor`
- List sponsors (scoped to event)
- Authenticated users can submit
- Optional votes (keep vote support consistent across submission types)

### 5.6 Other ClawCon sections (optional parity)
These can remain accessible from the left nav (either under ClawCon group or general):
- Events
- Robots
- Papers
- Awards
- Jobs
- Photos
- Livestream
- Skills
- Memes
- Chats
- Worldwide
- Logs

Implementation approach:
- Prefer a single reusable “SubmissionsView” component (Gateway style) with:
  - list (sort by vote_count then time)
  - vote action
  - submit form schema per type
  - city/event scoping

### 5.4 Events `/events`
File: `app/events/page.tsx` + `events-client.tsx`
Behaviors:
- Public list of events: selects from `events where is_public=true`.
- Supports filtering (city/category/date) and grid/list view.
- Authenticated users can submit new events (insert to `events`).
- Slug is computed from category/city/month/year.

### 5.4 ClawCon → Speakers (nav-item)
**Dashboard route:** `/clawcon/speakers`

Behaviors:
- Load submissions scoped to the active `event_id` (or via event-scoped RPC).
- Group by `presenter_name`.
- Show:
  - speaker name
  - submission count
  - latest activity
  - a few recent submissions
  - a few unique links

Notes:
- Speakers is a derived view, not a separate table.

### 5.6 Worldwide `/worldwide`
File: `app/worldwide/page.tsx` + `worldwide-client.tsx`
Behaviors:
- Ignores `city` for content; keeps it only for selector consistency.
- Fetches submissions for every city via event-scoped RPC and combines.
- Tabs for demos/topics + list/grid.

### 5.7 Photos `/photos`
Static curated photos per city (currently SF via JSON), optional videos list.

### 5.8 Logs `/logs`
File: `app/logs/page.tsx` + `app/logs/logs-client.tsx`
Behaviors:
- Public read-only
- Uses RPCs:
  - `get_public_recent_submissions(city.eventSlug)`
  - `get_public_recent_votes(city.eventSlug)`
- Votes are displayed as “anon” (no user_id).

### 5.9 Static image pages
- `/molt` → shows `/public/molt.png`
- `/youarehere` → shows `/public/youarehere.jpg`
- `/evolution` → shows `/public/evolution.jpg`

---

## 6) Server endpoints (Gateway backend)

In the OpenClaw fork, these are implemented in the Gateway server/runtime (not Next.js route handlers). The behavior should remain the same.

### 6.1 `POST /api/webhook`
File: `app/api/webhook/route.ts`
Purpose: allow bots to submit demos/topics via API key.

Auth:
- Header: `x-api-key`
- Server hashes key (`hashBotKey`) and checks `bot_keys.key_hash`.
- Rate limit: 20 submissions/hour per API key (in-memory Map).

Validations:
- Requires: `title`, `description`, `presenter_name`
- Accepts: `links[]` (https only)
- `submission_type` allowed: `topic` or `speaker_demo` (everything else coerced to speaker_demo)
- `submitted_by` normalized into: `human | bot | bot_on_behalf`
- If `bot_on_behalf`, requires `submitted_for_name`

Writes:
- Inserts into `submissions` (NOTE: currently does NOT set `event_id` — rebuild should decide event scoping for webhook submissions).

### 6.2 Bot key management
- `GET /api/bot-key` → informational/deprecated
- `POST /api/bot-key/reveal`
  - Requires Authorization Bearer Supabase access token
  - Uses service role to `auth.getUser(token)`
  - Rate limit 3/hour per user (in-memory)
  - Decrypts and returns bot key (plus last4)
  - Audit logs action `reveal`

- `POST /api/bot-key/regenerate`
  - Requires Authorization Bearer token
  - Creates or reuses bot_key row id, generates new key, encrypts
  - Upserts bot key (onConflict user_id)
  - Writes audit row `regenerate`
  - Returns plaintext key ONCE + warning

### 6.3 `POST /api/clawhub/sync`
File: `app/api/clawhub/sync/route.ts`
Purpose: fetch skills from `https://clawhub.ai/api/v1/skills` and upsert into `clawhub_skills`.

Auth:
- Bearer secret `CLAWHUB_SYNC_SECRET` (header or query param)

NOTE: `supabase.sql` in this repo does not define `clawhub_skills`; rebuild must either add the table or remove/replace this route.

---

## 7) Key user flows

### 7.1 Browse
- Anonymous user can view all public categories and items.
- City picker controls scope for event-based queries.

### 7.2 Sign in
- Email magic link via Supabase OTP.
- Redirect:
  - home uses `NEXT_PUBLIC_SITE_URL` when requesting OTP
  - post page includes explicit redirect to `/post/[id]`

### 7.3 Submit (human)
- Must be authenticated.
- Writes into `submissions` with `event_id` (except webhook route).

### 7.4 Vote
- Must be authenticated.
- Inserts into `votes`.
- Duplicate vote handled via unique constraint (23505).

### 7.5 Comment
- Must be authenticated.
- Inserts into `comments` (migration required).

### 7.6 Bot submit
- Needs bot API key.
- POST /api/webhook.

### 7.7 Public logs
- Anonymous can view `/logs` without seeing voter identity.

---

## 8) Configuration / environment variables

Client (public):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (redirect target)

Server (sensitive):
- `SUPABASE_SERVICE_ROLE_KEY` (via `lib/supabaseAdmin.ts`)
- `BOT_KEY_ENC_KEY`
- `BOT_KEY_ENC_KEY_VERSION`
- `CLAWHUB_SYNC_SECRET`

---

## 9) Known gaps / rebuild decisions

1) **Comments schema is not in `supabase.sql`**
   - It exists as separate migration SQL.
   - Rebuild should unify into a single migration set.

2) **Webhook submissions do not set `event_id`**
   - Decide whether bots submit city/event scoped content.

3) **ClawHub sync route references `clawhub_skills` table that isn’t defined here**
   - Either define the table + UI that uses it, or remove the sync route.

4) **Multiple pages duplicate header/nav**
   - Rebuild likely centralizes layout.

5) **RLS + security definer**
   - Current approach is pragmatic; rebuild may prefer explicit views for public data.

---

## 10) Acceptance criteria for parity rebuild

- All routes listed in Section 5 exist and functionally match.
- City scoping works consistently.
- Anonymous users can browse all public content.
- Authenticated users can submit/vote/comment.
- Bot keys can be generated/revealed with audit.
- Webhook submissions validated + rate-limited.
- `/logs` works anonymously without exposing user identities.

---

## 11) Appendix: Route inventory

### Gateway nav-items (minimum requested)
Add these to the left sidebar as `nav-item`s:
- ClawCon → Demos
- ClawCon → Topics
- ClawCon → Speakers
- ClawCon → Sponsors

(Everything else can be a second phase or remain as separate nav-items.)

Static pages:
- `/molt`
- `/youarehere`
- `/evolution`

Core:
- `/` (demos/topics)
- `/post/[id]`

Categories:
- `/events`
- `/speakers`
- `/robots`
- `/papers`
- `/sponsors`
- `/awards`
- `/jobs`
- `/photos`
- `/livestream`
- `/skills`
- `/memes`
- `/chats`
- `/worldwide`
- `/logs`

API:
- `/api/webhook`
- `/api/bot-key`
- `/api/bot-key/reveal`
- `/api/bot-key/regenerate`
- `/api/clawhub/sync`
