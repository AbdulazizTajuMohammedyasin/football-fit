# Football Fit — Implementation Plan

## Audit (starting point)

- Repository contained only the project rules file; no commits, no code.
- Tooling available locally: Node 24 / npm 11, Python 3.13. **No PostgreSQL server or Docker** is installed on the development machine.

## Key decisions

| Decision | Reason |
| --- | --- |
| Monorepo: `backend/` (Django + DRF) and `frontend/` (React + TS + Vite + shadcn/ui + TanStack Query) | Preferred stack; modular monolith. |
| Database configured through `DATABASE_URL`; PostgreSQL is the target (`docker-compose.yml` to be provided). SQLite is used only when `DATABASE_URL` is unset (local dev/tests). | PostgreSQL is not installed locally, so tests cannot run against it here. Models avoid DB-specific features so both work. |
| Ship a **fictional, clearly labelled demo dataset** (fictional clubs and players, deterministically generated metrics). | No verified free, licensed source for Premier League player statistics: football-data.org's free tier excludes squads and player stats (checked 2026-10-22); FBref/Opta-derived data has scraping restrictions. Inventing real-looking stats for real players is forbidden. |
| CSV import command with provenance (source name, licence note, season, as-of date). | Lets the owner load properly licensed real data later without code changes. |
| Metrics stored in a validated JSON field keyed by a metric catalogue; missing metrics are absent, never zero. | Supports role-specific profiles and explicit coverage. |
| All scoring is deterministic Python (no LLM). | Data integrity rules. |
| Authentication with djoser + JWT (stack updated in project rules). Public scouting endpoints stay read-only and anonymous; auth is used only for user-owned data (saved shortlists). | Adds auth without changing existing public API contracts. |

## Scoring model (summary)

- **Positions**: GK, CB, FB, DM, CM, AM, W, ST, each with one or two **role profiles** (weighted metric lists).
- **Percentiles**: mid-rank within the same position among players with 900+ minutes; lower-is-better metrics flipped.
- **Role score** (0–100): weighted mean of available percentiles. **Coverage** = available weight / total weight. Below 70 % is flagged as incomplete.
- **Fit score** (0–100): 60 % role quality, 25 % upgrade over the club's best current player in that role, 15 % minutes reliability; missing components renormalised and shown.
- **Club needs**: 45 % quality gap (league rank of the club's best established player), 35 % depth gap vs typical depth, 20 % minutes share of players aged 31+.

## Four-day schedule

Target: complete over ~4 calendar days, including testing, bug fixing and final verification. Each day ends at a committed, consistent checkpoint.

### Day 1 — Backend core and frontend foundation ✅ (complete)

Done and committed:

1. Backend scaffold: Django project, env-based settings, DRF, CORS, health endpoint, ruff + pytest.
2. Data model: data sources (with demo flag), clubs, players, player seasons, validated metric catalogue, admin.
3. Deterministic fictional demo dataset (`seed_demo`) and licensed CSV importer (`import_players_csv`).
4. Scoring engine: role profiles, percentiles, coverage-aware role scores, fit score.
5. Club needs analysis and role shortlists.
6. Read-only API: meta, clubs, club detail, needs, recommendations (validated filters), players, player detail, compare. 68 backend tests passing.
7. Frontend scaffold: Vite + TS + Tailwind + shadcn/ui + TanStack Query + router, typed API client, demo-data notice, club picker, club needs/squad page. Production build passing.

Known gap at the checkpoint: needs-page "Find a …" links point to `/clubs/:slug/shortlist`, which does not exist yet (shows "Page not found").

### Day 2 — Complete the core user journey (frontend)

1. Shortlist page: role selector, working filters (age range, minimum minutes, include incomplete data, include out-of-position), filters kept in the URL, fit-score breakdown, coverage flags, select players to compare.
2. Player evidence page: metric percentiles with raw values, missing values flagged, role scores per profile, coverage and low-minutes warnings.
3. Compare page: player search, add/remove (2–4), role switcher, side-by-side metric table.
4. Methodology page driven by `/api/meta/` (roles, weights, thresholds, data sources and licence notes).
5. Frontend unit tests (Vitest + Testing Library) for formatting, API client error handling and key components.

### Day 3 — Accounts and saved shortlists (djoser + JWT), PostgreSQL readiness

1. Add djoser + `djangorestframework-simplejwt`: register, obtain/refresh token, current user. Tests.
2. Saved shortlist model + authenticated CRUD API (user can only see/modify their own); migration and tests.
3. Frontend: sign-in/sign-up, token handling with refresh, "Save to my shortlist" from the shortlist and player pages, "My shortlists" page.
4. `docker-compose.yml` for PostgreSQL; verify migrations and tests against PostgreSQL **if a PostgreSQL server is available** (currently not installed — otherwise documented as unverified).

### Day 4 — Hardening, documentation and final verification

1. Edge cases and bug fixes found while exercising the full journey (empty clubs, players without seasons, all-missing metrics, real-data import path).
2. Accessibility and responsive pass (keyboard navigation, labels, mobile layout).
3. Production settings review (secret key, allowed hosts, CORS, debug off), `.env.example` files.
4. README: setup, data sources and licensing, demo-data warning, CSV schema, scoring explanation.
5. Final verification: ruff, pytest, oxlint, type check, Vitest, production build; record results.

## Blockers and limits

- PostgreSQL is not installed locally, so behaviour against PostgreSQL is unverified until a server is available.
- No licensed real Premier League player-statistics source has been verified; the product runs on fictional demo data until the owner imports licensed data.
