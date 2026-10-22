# Football Fit — Implementation Plan

## Audit (starting point)

- Repository contained only `claude.md` (project rules); no commits, no code.
- Tooling available locally: Node 24 / npm 11, Python 3.13. **No PostgreSQL server or Docker** is installed on the development machine.

## Key decisions

| Decision | Reason |
| --- | --- |
| Monorepo: `backend/` (Django + DRF) and `frontend/` (React + TS + Vite + shadcn/ui + TanStack Query) | Preferred stack in `CLAUDE.md`; modular monolith. |
| Database configured through `DATABASE_URL`; PostgreSQL is the target (`docker-compose.yml` provided). SQLite is used only when `DATABASE_URL` is unset (local dev/tests). | PostgreSQL is not installed locally, so tests cannot run against it here. Models avoid DB-specific features so both work. |
| Ship a **fictional, clearly labelled demo dataset** (fictional clubs and players, deterministically generated metrics). | No verified free, licensed source for Premier League player statistics: football-data.org's free tier excludes squads and player stats (checked 2026-10-22); FBref/Opta-derived data has scraping restrictions. Inventing real-looking stats for real players is forbidden. |
| Provide a CSV import command with provenance (source name, licence note, season, as-of date). | Lets the owner load properly licensed real data later without code changes. |
| Store per-90 / percentage metrics in a validated JSON field keyed by a metric catalogue; missing metrics are absent, never zero. | Supports role-specific profiles and explicit coverage. |
| All scoring is deterministic Python (no LLM). | Data integrity rules. |

## Scoring model (summary)

- **Positions**: GK, CB, FB, DM, CM, AM, W, ST.
- **Role profiles**: one or more per position, each a weighted list of metrics (e.g. ST "Penalty-box finisher" vs "Pressing forward").
- **Metric percentiles**: computed within the same position group among players meeting a minutes threshold. Lower-is-better metrics are inverted.
- **Role score** (0–100): weighted mean of available percentiles. **Coverage** = weight of available metrics / total weight. Missing metrics never count as zero.
- **Fit score** (0–100) = weighted blend of role score, upgrade over the club's current best in that position, and minutes reliability. Component values and weights are returned and displayed. It is a ranking aid, not a transfer probability.
- **Club needs**: per position, from depth vs target depth, minutes share of players aged 31+, and quality gap of the club's best player vs league. Each component and its evidence is returned.

## Increments

1. Backend scaffold: Django project, settings via env, DRF, CORS, health endpoint, tooling (ruff, pytest).
2. Data model: data sources, clubs, players, player seasons, metric catalogue + validation; admin.
3. Demo dataset generator (deterministic) + CSV import command with tests.
4. Scoring engine: percentiles, role scores, coverage (pure functions, unit tests).
5. Club needs analysis (pure functions, unit tests).
6. API: meta, clubs, club detail, needs, recommendations (filters), players, player detail, compare; API tests.
7. Frontend scaffold: Vite + TS + Tailwind + shadcn/ui + TanStack Query + router, API client, demo banner.
8. Frontend: club picker, club needs overview, squad.
9. Frontend: shortlist with working filters; player evidence page.
10. Frontend: compare page, methodology page.
11. Docs: README, `.env.example`, docker-compose for PostgreSQL; final checks.
