# Football Fit UI/UX redesign plan, round 2 (approved 2026-10-28; implemented, see iteration-log.md)

Date: 2026-10-28. Inputs: [page-inventory.md](page-inventory.md) (Phase 1 audit and baseline) and
[reference-research.md](reference-research.md) (Phase 2). This plan supersedes the visual direction
in [redesign-audit.md](redesign-audit.md) ("floodlit scouting report"). That document's data-integrity
constraints still apply.

Scope: presentation only, in `frontend/`. No changes to the API, models, scoring, authentication,
routing or URL parameters. No new npm dependencies: fonts come from Google Fonts, and the dialog uses
the `radix-ui` package that is already installed.

## 1. Problems ranked by impact

| Rank | Problem | Priority | Evidence |
|---|---|---|---|
| 1 | The shortlist, the core ranking task, shows about 3 candidates per screen; rows are 160 px with a ~450 px empty gap. | P1 | `desktop-05-shortlist` |
| 2 | Tall identity bands push working content down; on phones the home club picker starts ~1,180 px down. | P1 | `desktop-02`, `desktop-08`, `phone-01` |
| 3 | Bold condensed type is used for every level, so hierarchy is flat. | P2 | all pages |
| 4 | Red/amber/green means need level in one place and score band in another (inverted). | P2 | `desktop-02` |
| 5 | Dead-end errors: an unsupported role offers "Try again"; one unknown player breaks a comparison and shows raw IDs. | P2 | `desktop-07`, `desktop-10` |
| 6 | Compare on phones shows one player column at a time. | P2 | `phone-10` |
| 7 | Player page repeats the role metrics in an ungrouped "All recorded metrics" list. | P2 | `desktop-08` |
| 8 | Native browser confirm for deletes; methodology has no phone contents list. | P2 | code, `phone-12` |
| 9 | Demo-data strip costs 36–60 px on every page. | P2 | all pages |
| 10 | Decorative arcs cross text; 36 px pitch markers on phones. | P3 | `desktop-10`, `phone-02` |

## 2. Visual direction: "Matchnight lab"

A calm, monochrome analysis desk in green-ink and bone, with one floodlight-lime signal reserved for
"go" and "selected". Type does the work: one regular-weight grotesque at strongly contrasting sizes,
with mono labels for provenance. It fits the product because Football Fit's promise is *evidence,
not hype*: a flat, instrument-like surface reads as measurement, and rationing colour makes the few
coloured things (your selection, the next step) unmissable.

What changes from today: the type system (bold condensed becomes single-weight grotesque plus mono),
colour discipline (a red/amber/green scale becomes a monochrome need meter with words), density
(cards become tables on the ranking pages), and compact headers.

What stays: the pitch need map, provenance on every page, demo labelling, hatched "missing" bars,
and URL-driven state.

## 3. Design system

### Colour tokens (semantic; components never use raw hex)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--ink` | `#21302d` | Text on light; dark bands; primary button fill | 12.7:1 on bone |
| `--ink-2` | `#4b5a56` | Secondary text on light | 6.7:1 on bone, 6.0:1 on tissue |
| `--bone` | `#f6f6f2` | Page canvas | — |
| `--paper` | `#ffffff` | Cards, tables, inputs | — |
| `--tissue` | `#e9ebe3` | Alternate rows, wash surfaces, table header | — |
| `--line` | `#d3d6cb` | 1 px hairlines on light (decorative, so no contrast minimum) | — |
| `--line-strong` | `#858f88` | Input and checkbox borders (component boundary) | 3.3:1 on paper, 3.1:1 on bone |
| `--on-ink` | `#f6f6f2` | Text on dark bands | 12.7:1 |
| `--on-ink-2` | `#aab8b2` | Secondary text on dark | 6.7:1 on ink |
| `--line-on-ink` | `#46544f` | Hairlines on dark | — |
| `--signal` | `#d6f27a` | Arrow buttons, active nav and tab, selected rows, focus ring fill, tag dots. Never text, never large surfaces | ink on signal 11:1 |
| `--caution` / `--caution-bg` | `#7a4b00` / `#fbf1d6` | Data-integrity warnings only: demo data, incomplete coverage, small sample | 6.6:1 |
| `--danger` / `--danger-bg` | `#a8241b` / `#fbe9e6` | Errors and destructive actions only | 6.1:1 |

**Need level is shown in monochrome:** a three-segment meter (▮▮▮ high, ▮▮▯ medium, ▮▯▯ low,
hatched for unknown) in ink, always with the word. Score bars are ink on tissue; missing values are
hatched. This removes the red/amber/green double meaning (problem 4).

### Typography
- **Inter Tight** (Google Fonts) for display and body, the documented substitute for Integrated's
  Aspekta. Weight 400 throughout. **Deviation, on purpose:** 500 is allowed only for player and
  club names in dense tables and for button labels, because at 14–15 px weight helps scanning more
  than size can.
- **JetBrains Mono** (Google Fonts) at 400 for metadata: source and dates, column headers, position
  codes, tags, section counters, button labels on dark buttons. Never for numbers being compared.
  Those use Inter Tight tabular figures.
- **Scale (px / line-height / tracking):** 13/1.3/0 mono · 14/1.45/0 · 16/1.5/0 body ·
  20/1.3/−0.005em · 28/1.15/−0.01em · 40/1.05/−0.02em · 56/1.0/−0.025em (page titles, desktop
  only) · 72/0.98/−0.03em (home hero only). Phone titles are capped at 40.
- Body text is at least 15 px. Text-xs (12 px) is removed from meaningful content.

### Spacing, layout and shape
- 4 px base; scale 4, 8, 12, 16, 20, 24, 32, 40, 56, 80. Section gaps are 56–80 px on marketing-like
  areas (home, methodology) and 24–32 px in working views.
- Content max-width 1200 px, gutters 16 px (phone), 24 px (tablet), 32 px (desktop). Reading
  measure ≤ 70 characters.
- Breakpoints: 640, 768, 1024, 1280 (Tailwind defaults).
- Radii: 6 px buttons and inputs; 10 px tags; 16 px cards and tables; 9999 px only for the nav pill
  group and dots.
- **No shadows**, except a 1 px ring on focus and the popover (one soft shadow so it separates from
  content beneath).

### Components and states
| Component | Spec |
|---|---|
| Button / primary | ink fill, on-ink text, 40 px tall (44 on phones), 6 px radius |
| Button / arrow | 40×40 signal square with ink arrow, paired after a primary or used alone with an accessible name |
| Button / outline | transparent, 1 px `--line-strong`, ink text |
| Button / ghost | text only; hover fills tissue |
| States | hover darkens or fills tissue (150 ms colour transition); focus is a 2 px ink outline offset 2 px plus a signal halo; disabled is 45% opacity with no pointer; loading swaps the label for "Working…" and sets `aria-busy` |
| Input / select | paper, 1 px `--line-strong`, 40 px; focus as above; error state uses a danger border and a message under the field |
| Tag | mono 12–13 px in a 10 px-radius outline; optional 6 px dot (signal = active, caution = data warning) |
| Table | paper on bone, 16 px radius, tissue header with mono 12 px column labels, 52–56 px rows, hairline row dividers, row hover tissue, selected row with a 3 px signal left bar |
| Need meter | three 6×14 px segments plus the word |
| Score bar | 4 px track tissue, fill ink; missing is hatched; value shown as text beside it |
| Page header | light (bone) by default; ink band only on club and player pages, at most 260 px at 1440 |
| Dialog | radix-ui Dialog, paper, 16 px radius, focus-trapped, Esc closes |

### Icons
lucide-react only (already installed), 16 or 20 px, 1.75 stroke. Icon-only buttons always have an
accessible name.

## 4. Page-by-page plan

| Page | Primary task | Changes |
|---|---|---|
| Shell | Move between clubs, compare, method, account | 64 px bar on bone with a hairline: wordmark left, a bordered pill nav group right (active filled in ink), Sign in as outline. Phone: square menu button opens a full-screen sheet with 56 px rows and account actions pinned at the bottom. The demo notice becomes a single 32 px mono line with a dot and a "What this means" link; it wraps to two lines at most on phones. The footer is an ink band with mono links; no decorative arcs. |
| Home | Pick a club | Hero (≤ 420 px at 1440): 72 px headline + one sentence + a composite "Find a club" input with an ink "Open" button (Enter opens the first match; typing filters the list below). Under it, a provenance strip built only from API data (source, season, as-of date, number of clubs). The club list sits directly below as a dense grid of rows. The journey becomes a single numbered line of four steps. **Phone target:** search and first clubs visible within the first screen. |
| Club needs | See what is short, open a shortlist | Compact ink header (≤ 260 px at 1440): club name 56 px, provenance in mono, demo tag. The pitch need map moves into the body beside a ranked need table (lg: map 40%, table 60%; phone: map, then table). Table rows: position, need meter + word, score, one-line headline evidence, role links (arrow button for the first role). Each row expands to show components and all evidence. The top need gets a signal left bar. Phone markers are 44 px. |
| Squad tab | Scan the squad | Same table system: position filter as a pill group, columns for name, position, age, minutes, best role + score bar. The phone list stays (already good) with the new styling. |
| Shortlist | Rank, inspect, pick to compare | Desktop table: rank, player (name, club in mono), age, minutes, coverage tag, fit score + bar, compare checkbox, save. About 56 px rows, so **≥ 8 rows visible below the header at 1440×1000**. The filter rail stays on the left, restyled and tighter. "Why this score?" becomes a row toggle (chevron in the row) that opens an evidence row. Phone: two-line rows (~96 px) with the score on the right and the compare checkbox as a 44 px target. An unsupported role (400) shows a message plus links to the club's supported roles, not "Try again". The compare tray restyles to ink with a signal action. |
| Player | Judge the evidence | Compact ink header with facts in a mono definition row. Fields that the source never provides (FPL nationality and foot) are collapsed into one line ("Not provided by this source: nationality, preferred foot") instead of two empty slots. Role scores sit in a two-up section; "Other recorded metrics" lists only metrics not already shown in the role cards. |
| Compare | Read differences | Table with player columns labelled A–D (no series colours); "Best" stays a text tag. **Phone:** per-metric blocks listing every player vertically, so all players are visible without sideways scrolling. When the API says a player is unknown (404), look each selected player up with the existing player endpoint, mark the unknown chips, and offer "Remove unknown players". |
| Methodology | Trust the numbers | Editorial layout: 40 px section titles with mono section counters (it is a real sequence of sections), sticky contents on desktop, and a collapsible "On this page" list at the top on phones. Role profiles become a compact table grouped by position. |
| Sign in / up | Get an account | Single centred paper card (max 420 px) on bone; one sentence on what accounts add. No ink side panel. |
| My shortlists | Manage lists | Header with a composite "New shortlist" input and button; lists as table cards. Delete uses an in-app confirm dialog. Unavailable players read "No longer in the current data" with the ID in mono. |
| 404 / errors | Get back on track | Every error state names what happened and offers a working next action. |

## 5. Shared components to change or create
- **Change:** `index.css` tokens, `index.html` fonts, `ui/button` (variants above plus `arrow`),
  `ui/input`, `ui/select` trigger, `ui/checkbox`, `ui/tabs` (pill group variant), `ui/table`,
  `ui/badge` (into tag styles), `score.tsx` (ScoreBar, CoverageBadge, NeedBadge, PositionChip),
  `page.tsx`, `states.tsx`, `Layout.tsx`, `SourceLine.tsx`, `MetricRow.tsx`, `NeedMap.tsx`,
  `SaveToShortlist.tsx` (styling only).
- **Create:** `ui/dialog.tsx` (radix-ui Dialog, already installed), `NeedMeter`, `ArrowLink` (dark
  button and arrow square pair), `DataTable` styling helpers (classes, not a new table library),
  `ProvenanceStrip`.
- **Remove after migration:** the `pitch-band` arc background, the `series-*` tokens, the Barlow fonts.

## 6. Responsive and accessibility requirements
- No horizontal page scroll at 390, 768, 1024 or 1440. Tables may scroll inside their own container
  on tablet only. Phones get list layouts instead.
- Touch targets ≥ 44×44 px on phones (pitch markers, checkboxes via their label rows, menu buttons).
- Text contrast ≥ 4.5:1 (body) and ≥ 3:1 (large text and component boundaries); values are in the token table.
- Visible focus on every interactive element; logical tab order; the skip link stays.
- Colour is never the only signal (need words, "Best" tags, coverage text).
- `prefers-reduced-motion`: transitions off (already in place).
- Dialog: focus trap, Esc to close, focus returns to the trigger.

## 7. Functionality that must be preserved
URL parameters (`tab`, `role`, `min_age`, `max_age`, `min_minutes`, `include_low_coverage`,
`include_secondary`, `players`); filter validation messages; max 4 compare selections; save
popover and sign-in redirect with `next`; tab and anchor behaviour; every text that tests assert
(`Filter clubs`, `Fictional demo data`, `Demo`, `Incomplete data · 60%`, `Minimum league minutes`,
`Apply`, `Try again`, `Choose a role to build a shortlist`, auth button names and alerts); "Not
recorded" wording; demo labelling; provenance lines.

## 8. Risks, dependencies, unknowns
- **Shortlist rewrite (High risk):** it carries the most behaviour. Mitigation: keep `FilterForm`,
  `toggle`, `update` and the query logic untouched; change markup only; existing tests must pass
  unchanged.
- **The "Try again" text is asserted for the home error test.** It stays for retryable errors; only
  the unsupported-role (400) case changes.
- **Compare unknown-player lookup** adds up to four player requests, and only after a 404. These use
  existing endpoints, so there is no API change.
- **Fonts:** Google Fonts is a third-party request. If unavailable, fallbacks are system-ui and
  ui-monospace.
- **Unknown:** no competition criteria or deadline in the repo, so I assume all pages are in scope
  and prioritise the core journey (home → club → shortlist → player → compare).

## 9. Screenshot and test workflow (no new dependencies)
- Servers: Django `runserver` and `npm run dev` against the local database.
- Capture: a throwaway Chrome DevTools Protocol script outside the repo (already used for the
  baseline). It waits for `document.fonts.ready` and network idle, captures 1440×1000 and 390×844
  (plus 768×1024 where layouts change), can mock API responses for signed-in states, and records
  console errors, failed requests and horizontal overflow.
- Per milestone: capture, review against the checklist in the brief, rank P0–P3, fix, recapture.
  At most 3 iterations. Notes go in `docs/design/iteration-log.md`.
- Interactions scripted per milestone with real mouse and keyboard events (tabs, filters, compare
  selection, search-add, menu, dialog).
- Gates per milestone: `npm test`, `npm run typecheck`, `npm run lint` (no new warnings), and
  `npm run build` at the end. Backend `pytest` once at the end to confirm nothing outside the
  frontend changed.
- Screenshots go to a local folder, outside
  the repo.

## 10. Milestones and acceptance criteria

| # | Milestone | Acceptance criteria (measurable) |
|---|---|---|
| M1 | Tokens, fonts, primitives, shell | All colours come from tokens (grep finds no raw hex in `src/` outside `index.css` and the favicon); new button/input/select/checkbox/tag/table/dialog styles in use; header ≤ 64 px plus a demo line ≤ 32 px at 1440; phone menu opens and closes, and closes on navigation; keyboard reaches every nav item with visible focus; tests, typecheck and lint pass. |
| M2 | Home | At 390×844 the search field and at least 2 clubs are visible without scrolling; at 1440×1000 at least 10 clubs are visible; Enter in the search opens the first match; the provenance strip shows only API values; home tests pass. |
| M3 | Club needs and squad | Header ≤ 260 px at 1440; the top need is visually distinct; `?tab=squad` and `#need-XX` work; pitch markers ≥ 44 px on phones; no colour-only meaning. |
| M4 | Shortlist | At 1440×1000, ≥ 8 candidate rows visible below the page header; phone rows ≤ 110 px; every filter, toggle, compare (max 4), tray and save path works; the unsupported role shows supported-role links; shortlist tests pass unchanged. |
| M5 | Player and compare | Player header ≤ 260 px at 1440; no metric shown twice; on phones every compared player is visible for each metric without sideways scrolling; unknown players can be removed in one action. |
| M6 | Methodology, auth, my shortlists, 404 | Phone contents list on methodology; delete uses the in-app dialog (Esc and focus return verified); auth tests pass. |
| M7 | Regression pass | Full screenshot set at 390/768/1440; no console errors or unexpected failed requests; no overflow; keyboard pass on the core journey; tests, typecheck, lint, build and backend pytest pass; diff reviewed. |

## 11. Implementation order
M1 → M2 → M3 → M4 → M5 → M6 → M7. Each milestone is one or two commits after its screenshot loop.
M4 is the highest value and highest risk, so it comes after the shared system is stable but before
the lower-traffic pages.
