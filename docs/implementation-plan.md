# Football Fit — Implementation Plan

## Audit (starting point)

- Repository contained only the project rules file; no commits, no code.
- Tooling available locally: Node 24 / npm 11, Python 3.13, MySQL 8.0 server (credentials not available to the agent). No Docker.

## Key decisions

| Decision | Reason |
| --- | --- |
| Monorepo: `backend/` (Django + DRF) and `frontend/` (React + TS + Vite + shadcn/ui + TanStack Query) | Preferred stack; modular monolith. |
| Database configured through `DATABASE_URL`; **MySQL 8** is the target (changed from PostgreSQL at the owner's request on 2026-10-24; see `docs/database.md`). SQLite is used only when `DATABASE_URL` is unset (local dev/tests). | Owner decision. Models and queries avoid DB-specific features (e.g. JSON lookups) so MySQL and SQLite behave the same. |
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

### Day 2 — Complete the core user journey (frontend) ✅ (complete)

Done and committed:

1. Shortlist page: role selector, validated filters (age range, minimum minutes) kept in the URL, opt-in incomplete-data and out-of-position toggles, fit-score and role-metric breakdowns, selection for comparison.
2. Player evidence page: profile facts, role scores per profile, all relevant metrics with missing values labelled, small-sample and coverage warnings. API fix: players without season data return a full profile.
3. Compare page: player search, add/remove (2–4), role switcher, side-by-side metric table with best-value shading.
4. Methodology page rendered from `/api/meta/`.
5. Vitest + Testing Library: 27 tests (formatting, URL/filter parsing, API client errors, club picker states, shortlist filters, missing-metric rendering).
6. Manual check with the dev servers and headless Chrome screenshots (club needs, shortlist, player, compare, narrow width ~500 px); fixed need-bar colours, "a/an" wording and compare-button layout.

Carried to Day 4: true 390 px phone-width check (headless Chrome here cannot go below ~500 px); the methodology page hard-codes the need-level thresholds (60/35) instead of reading them from the API.

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
