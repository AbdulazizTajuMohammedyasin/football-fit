# UI/UX page inventory (Phase 1 audit, round 2)

Audit date: 2026-10-28. This audits the interface as it stands after the first redesign
(commits `e639ded` to `c8eaa82`). Every route below was found in
[`frontend/src/main.tsx`](../../frontend/src/main.tsx). Every finding was checked against the code or
against the baseline screenshots.

**How to read it**
- **Verified** means it was seen in the code or in a screenshot.
- **Interpretation** means a design judgement.
- **Open** means it still needs an answer.
- **Risk** is how likely a redesign of that page is to break behaviour: Low, Medium or High.
- Priorities: **P0** broken or information lost, **P1** major hierarchy, navigation, usability or
  responsive defect, **P2** noticeable inconsistency or friction, **P3** cosmetic.

## Baseline evidence

| What | Where | Notes |
|---|---|---|
| Baseline screenshots: 17 routes and states × 2 viewports | a local folder (outside the repo) | Desktop is 1440×1000, phone is 390×844 (mobile emulation), full-page, at 1× scale. Captured from the local dev servers (`npm run dev`, Django `runserver`) against the local database (FPL import as of 24 Oct 2026, plus the fictional demo league). The signed-in page used mocked API responses with a made-up `testfan` account, so no account was created and no private data appears. |
| Frontend checks | `frontend/` | `npm test`: 38 passed. `npm run typecheck`: clean. `npm run lint`: 5 warnings (all `only-export-components`), 0 errors. |
| Backend tests | `backend/`, `pytest` | 97 passed. |
| Browser tooling | none in the project | No Playwright dependency. Screenshots and interaction checks use a throwaway Chrome DevTools Protocol script outside the repo (Node 24 built-in WebSocket, installed Chrome), which can also mock API responses. |
| Console and network errors during capture | — | No console errors on any route. Failed requests appeared only where expected: a `400` for an unsupported role, `404`s for an unknown club and an unknown player in a comparison. |
| Competition or judging documents | none in the repo | **Open:** no competition requirements, judging criteria or deadline were found in `football-fit/`. |

Not captured: loading states (they last well under a second locally), the Save-to-shortlist popover
when signed in, deleting a saved list, and keyboard-only navigation. These need mocked delays or a
test account; see the plan's screenshot workflow.

## Product in one paragraph

Football Fit is a public, evidence-first squad-fit tool for Premier League fans. The core journey is
**choose a club → read its needs → open a role shortlist → inspect a player → compare candidates**.
Accounts are optional and only add saved shortlists. Data comes from the unofficial FPL API (broad
positions only: GK, DF, MF, FW) and a clearly labelled fictional demo league (detailed positions).
Every score is deterministic and explained by its weights.

## The app shell

| Part | File | Now (verified) | Issues |
|---|---|---|---|
| Header | [`components/Layout.tsx`](../../frontend/src/components/Layout.tsx) | Sticky 64 px pitch-green bar: wordmark, Clubs, Compare, How scoring works, Sign in / My shortlists / Sign out. On phones, a menu button opens a disclosure panel. | **P2:** there is no way back to the club you were working on: the nav has only global links, and the shortlist and player pages have a one-level back link. |
| Demo-data notice | same | A yellow strip under the header on **every** page, even pages that show only real data. | **P2 (interpretation):** it takes 36–60 px on every page, and three lines on phones, while the same labelling already appears per club and per player. It must stay truthful; only its placement and size are in question. |
| Footer | same | Pitch band with the fit-score caveat and a methodology link. | **P3:** the decorative pitch-arc line crosses the "Read how scoring works" link text on desktop (`desktop-10-compare`). |
| Page header | [`components/page.tsx`](../../frontend/src/components/page.tsx) | Light or pitch-band header with a back link, a context line, a title of 36–60 px and meta. | **P1:** on club and player pages the band is about 380–420 px tall at 1440 wide, and the title is bottom-aligned with empty space above it (`desktop-02`, `desktop-08`). **P2:** a context line sits above most titles ("Recruitment shortlist for Arsenal" above "Finisher shortlist for Arsenal"), repeating the title. |

## Routes

### `/` Clubs (home): [`pages/HomePage.tsx`](../../frontend/src/pages/HomePage.tsx)
- **User and purpose:** a first-time or returning fan choosing a club. **Primary action:** pick a club.
- **Data:** `GET /api/clubs/` (name, short name, squad size, source, demo flag), `GET /api/meta/` for the sources panel.
- **Interactions:** a name filter (client-side), club tiles grouped by source, a methodology link.
- **States:** loading skeleton, error with retry, no clubs (import instructions), no filter match. Tests cover all four.
- **Issues:**
  - **P1:** on phones the club picker starts about 1,180 px down, after two and a half screens of hero, steps and sources (`phone-01`). On desktop it starts at about 650 px.
  - **P2:** the four steps repeat what the page and navigation already do, and the sources panel duplicates the methodology page.
  - **P2:** 40 near-identical tiles carry only a code, a name and a squad size, so nothing helps a user choose. Per-club need data would need one request per club, which is an API cost question (Open).
- **Risk:** Low.

### `/clubs/:slug` Club needs and squad: [`pages/ClubPage.tsx`](../../frontend/src/pages/ClubPage.tsx), [`components/NeedMap.tsx`](../../frontend/src/components/NeedMap.tsx)
- **Purpose:** understand where the squad is short. **Primary action:** open a role shortlist from a position.
- **Data:** `GET /api/clubs/:slug/` (squad, thresholds, available roles), `GET /api/clubs/:slug/needs/` (per position: score, level, three weighted components, evidence lines, roles).
- **Interactions:** Needs/Squad tabs synced to `?tab=squad`, pitch markers that link to `#need-XX`, role buttons to the shortlist, a squad position filter (client-side), player links.
- **States:** page loading, page error (unknown club → "Could not load club"), needs loading/error/empty, squad empty, players with no score ("Not enough data to score"), incomplete-coverage badges.
- **Issues:**
  - **P1:** the header band is tall with dead space left of the title (see shell). The tab bar starts at about 540 px.
  - **P2:** four or eight full-width need cards repeat the same three-bar layout at the same weight. The top need is not visually distinct from a "Low need" scoring 0.0 (`desktop-04`).
  - **P2:** the three component bars use the inverted red/amber/green scale, while the overall need uses badges, so the same colour carries two meanings on one card.
  - **P3:** on phones the pitch markers are 36 px. They are tap targets, below the 44 px guideline.
- **Risk:** Medium (the tab URL sync and anchors must survive).

### `/clubs/:slug/shortlist?role=…` Shortlist: [`pages/ShortlistPage.tsx`](../../frontend/src/pages/ShortlistPage.tsx)
- **Purpose:** ranked candidates for one role. **Primary actions:** inspect evidence, pick players to compare, save.
- **Data:** `GET /api/clubs/:slug/recommendations/` with `role`, `min_age`, `max_age`, `min_minutes`, `include_low_coverage`, `include_secondary`; meta for roles and metric units.
- **Interactions:** role select, age/minutes form with validation (tested), two include toggles, per-row Compare checkbox (max 4) and a sticky compare tray, Save popover or "Sign in to save", "Why this score?" disclosure per row. All filters live in the URL.
- **States:** no role, unknown role, unsupported role (API `400`, shown as an error with retry), loading, updating, no matches, low-coverage and out-of-position badges.
- **Issues:**
  - **P1:** density. Each of the 20 rows is about 160 px on desktop, with roughly 450 px of empty space between the name and the score, so 3 candidates fit in the first 1000 px and the page is 4,285 px long (`desktop-05`). On phones, rows are about 230 px. For a ranking task, scanning and comparing neighbours is the core job.
  - **P2:** 20 identical full-width "Why this score?" bars add a second band to every row.
  - **P2:** the unsupported-role error offers "Try again", which cannot succeed, and does not suggest a supported role.
  - **P2:** the key comparison numbers (age, minutes, club) are in a grey sentence rather than aligned columns.
- **Risk:** High (validation, URL state, compare selection and tests).

### `/players/:slug` Player profile: [`pages/PlayerPage.tsx`](../../frontend/src/pages/PlayerPage.tsx)
- **Purpose:** inspect one player's evidence. **Primary actions:** compare, save.
- **Data:** `GET /api/players/:slug/` (facts, metrics with percentiles and pool size, role scores, coverage, minutes flag).
- **Interactions:** back to the club squad, Compare (pre-fills `/compare`), Save.
- **States:** loading, error, no season data, small-sample and missing-metric warning, null role score.
- **Issues:**
  - **P1:** the same tall-band issue as the club page.
  - **P2:** "All recorded metrics" is an undifferentiated list of 12–22 bars, and the role cards above already show most of the same metrics, so the page repeats itself without grouping.
  - **P2:** for FPL players, Nationality and Preferred foot always read "Not recorded" (FPL does not provide them). This is truthful but takes two of six fact slots on every real player.
- **Risk:** Low.

### `/compare?players=…&role=…` Compare: [`pages/ComparePage.tsx`](../../frontend/src/pages/ComparePage.tsx)
- **Purpose:** 2–4 players on one role profile. **Primary action:** read who is stronger on which metric.
- **Data:** `GET /api/compare/`, `GET /api/players/?search=` (picker), meta.
- **Interactions:** search and add (max 4), remove chips, role select, links to players.
- **States:** fewer than two players, loading, error, no search results, "Not recorded" cells, "Best" markers.
- **Issues:**
  - **P2:** if one player in the link is unknown, the whole comparison fails ("Unknown player(s): martin-odegaard"), the chips show raw slugs, and the message does not say to remove that player (`desktop-10`).
  - **P2:** on phones only one player column is visible at a time (sideways scrolling), which defeats side-by-side reading.
- **Risk:** Medium.

### `/methodology`: [`pages/MethodologyPage.tsx`](../../frontend/src/pages/MethodologyPage.tsx)
- **Purpose:** trust: sources, licences, missing data, formulas, role weights, glossary.
- **Data:** meta only.
- **Issues:**
  - **P2:** on phones it is about 12,900 px long with no contents list.
  - **P3:** 23 role-profile cards at equal weight.
- **Risk:** Low.

### `/signin`, `/signup`: [`pages/AuthPage.tsx`](../../frontend/src/pages/AuthPage.tsx)
- **Purpose:** optional account for saving lists. **Data:** djoser and JWT endpoints.
- **States:** missing fields, wrong credentials, server validation errors (all tested), submitting, already signed in (redirects to `next`).
- **Issues:** **P3:** the explanation panel is the strongest visual on the page, competing with the form. Otherwise good.
- **Risk:** Medium (auth flow and the `next` redirect).

### `/shortlists` My shortlists: [`pages/MyShortlistsPage.tsx`](../../frontend/src/pages/MyShortlistsPage.tsx)
- **Purpose:** manage saved lists. **Data:** `GET/POST/DELETE /api/me/shortlists/…`.
- **Interactions:** create, open (back to the club shortlist), compare (first four available), delete list (native `window.confirm`), remove player.
- **States:** checking session, redirect to sign-in, loading, error, no lists, empty list, unavailable player.
- **Issues:**
  - **P2:** deleting a list uses the browser's native confirm, which is unstyled and different on every browser.
  - **P3:** unavailable players show a raw slug in italics.
- **Risk:** Medium (mutations).

### `*` 404 (in `main.tsx`)
- **Issues:** none significant. **Risk:** Low.

## Cross-cutting findings

| # | Finding | Priority |
|---|---|---|
| 1 | Low information density on the core ranking task (shortlist) and on the club needs list. | P1 |
| 2 | Tall identity bands push working content down on club and player pages. On phones, the home hero buries the club picker. | P1 |
| 3 | Barlow Condensed is used for titles, section headings, scores, chips, fact values and table numbers alike, so it no longer signals what matters most. | P2 |
| 4 | A lot of meaningful text is 12 px (weights, captions, metric meta, badges). Contrast passes, but scanning suffers. | P2 |
| 5 | Red, amber and green mean "need level" in one place and "score band" in another (inverted on need components). | P2 |
| 6 | Error states do not always offer a working way forward (unsupported role, unknown compare player). | P2 |
| 7 | The native confirm dialog and the role `Select` are the only two control styles not yet matched to the system. | P2 |
| 8 | Pitch-arc decoration overlaps text in the footer and the phone hero. | P3 |

## Strengths to keep

- Provenance is visible everywhere (source, season, as-of date), and demo data is always labelled.
- Missing data is shown as missing (hatched bars, "Not recorded"), never as zero.
- Every filter, tab and selection is in the URL, so links and Back work.
- The pitch need map is a genuinely useful, football-specific visual.
- No horizontal page overflow at 390, 768 or 1440 px; no console errors.
