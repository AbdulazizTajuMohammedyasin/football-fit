# Redesign iteration log (round 2)

Screenshots live outside the repo in `C:\Users\abdul\Desktop\football-fit-screenshots\round2\<milestone>\`.
Each entry lists what the screenshots showed, what was fixed, and what was checked.

## M1: tokens, fonts, primitives, shell (2026-10-28)

- **Built:** "Matchnight lab" tokens in `index.css`, with shadcn names mapped onto them and earlier
  names kept as aliases until M7. Fonts are Inter Tight and JetBrains Mono. Button variants
  (`default`, `signal`, `outline`, `secondary`, `ghost`, `link`, `destructive`), tag, input,
  select, checkbox, table, `AlertDialog`, `ArrowLink`, `NeedMeter`, the monochrome `ScoreBar`, the
  light-surface `NeedMap`, compact `PageHeader`, states, and a shell with a pill nav, phone sheet
  menu, one-line demo notice and ink footer.
- **Iteration 1 findings:**
  - P1: the demo notice wrapped to 3 lines on phones (limit 2). Fixed with shorter copy that still
    says what Demo means and links to the data notes.
  - P2: the 404 page still used bold display weights. Restyled to the single-weight scale.
- **Iteration 2:** the notice fits 2 lines at 390 px; 404 matches the system.
- **Checks:** typecheck clean; tests 38/38 (one run had a single shortlist test fail under load; it
  passed in isolation and in two further full runs); no raw hex in `src/` outside `index.css`;
  phone menu opens, shows the account action pinned at the bottom, and closes on navigation;
  keyboard Tab shows a visible focus ring on nav pills; no overflow at 390 or 1440.
- **Known interim state:** pages not yet migrated still use old class names through the aliases
  (bold weights in places, ink bands where the club and player headers will change in M3 and M5).

## M2: home (2026-10-28)

- **Built:** a left-aligned hero with the question as the headline and a composite "Filter clubs"
  search with a signal "Open" button that opens the first match. Live feedback names the club that
  Enter will open. Under it: the four-step journey as one mono line, an ink provenance strip
  (sources, real or fictional, as-of dates and club count, all from the API; it moves below the
  list on phones), and the clubs as dense rows grouped by source.
- **Iteration 1 findings:** P2: "1 clubs" when a filter leaves one club. Fixed the plural. P3: on
  phones the group's club count wrapped to its own right-aligned line; it now sits inline.
- **Acceptance:** at 390×844 the search and 3 clubs are visible without scrolling (was about
  1,180 px down). At 1440×1000, 16+ clubs are visible. The Open button and Enter both open the
  first match (verified: "new" opens `/clubs/newcastle`, "ars" opens `/clubs/arsenal`). The
  no-match text appears. Home tests 3/3. No overflow at 390, 768 or 1440; no console errors.

## M3: club needs and squad (2026-10-28)

- **Built:** a compact ink header (about 200 px at 1440, was about 400) and Radix tabs restyled as a
  pill group. The pitch need map sits on a light surface beside a ranked list of positions: need
  meter and word, score, "biggest factor" (the component with the largest weighted contribution,
  derived from the API values), an expandable "Evidence and components" panel, and the first role
  as the arrow action. The top need carries a signal edge. The squad tab uses the pill filter, the
  table styles, and the phone list.
- **Iteration 1 findings:** P1: one desktop capture came out blank, but it re-rendered normally on
  recapture (first capture of a fresh browser), so this was not a page fault. P2: pitch stripes
  were too contrasty against the paper surface; softened. P2: three component columns beside the
  map wrapped their "weight" labels; they now stack at `lg` and return to three columns at `xl`.
- **Acceptance:** header ≤ 260 px; the top need is distinct (signal edge plus first position);
  `?tab=squad` is set by clicking the tab (verified URL); `#need-FW` is set by a pitch marker
  (verified URL); markers are 44 px; need level is always written as a word. No overflow at 390 or
  1440; no console errors.

## M4: shortlist (2026-10-28)

- **Built:** a ranked table that shares one column template between header and rows (rank, player
  with position and club in mono, age, minutes, fit score with bar, pick, save, evidence toggle),
  from `xl` (1280 px) up. Below that, two-line rows with 44 px compare, save and evidence targets.
  "Why this score?" is now a per-row toggle (`aria-expanded`, `aria-controls`) that opens the
  evidence panel. The filter rail is restyled. The compare tray is ink with a signal action. An
  unsupported role (API `400`) drops "Try again" and lists the roles the club's data can score.
  Filter logic, URL handling, validation and compare selection are unchanged.
- **Iteration 1 findings:**
  - P1: at 1440, the player column was about 200 px, so names wrapped and rows grew to about 85 px
    (6 rows on screen).
  - P1: at 768 the table layout was cramped.
  - Fix: the table layout moved to `xl`; pick and save became icon/checkbox-only there, with
    screen-reader labels that include the player's name.
- **Iteration 2 findings:**
  - P1: on phones the meta line truncated and hid minutes. It now wraps; rows are about 100 px.
  - P1: on phones the compare tray's chips wrapped and overlapped "Clear". The phone tray now
    shows the count and actions only; picked rows keep their signal edge.
- **Iteration 3:** verified at 1440, 768 and 390.
- **Acceptance:**
  - 9 candidate rows visible at 1440×1000 (was 3).
  - Phone rows about 100 px; long names that wrap reach about 125 px, slightly over the 110 px
    target, with no information lost.
  - Picking Haaland and Isak, then the tray's Compare, opens
    `/compare?players=erling-haaland,alexander-isak&role=fw-finisher` (verified).
  - The evidence toggle opens the panel.
  - `?role=cb-stopper` shows 8 supported-role links; "Finisher" opens `?role=fw-finisher` (verified).
  - Shortlist tests 3/3 unchanged; no overflow; no console errors.

## M5: player and compare (2026-10-28)

- **Player:** a compact ink header (about 155 px at 1440, was about 400) with the position chip,
  provenance, and the Compare arrow action plus Save. A paper facts strip lists only recorded facts;
  fields the source does not record are named in one sentence ("Not recorded by this source:
  appearances, nationality, preferred foot") instead of empty slots. Role cards mark the highest
  role score with a signal edge and tag. "Other recorded metrics" lists only metrics not already
  shown in a role card (for an FPL midfielder: 3 instead of 12).
- **Compare:** players are keyed A–D (no series colours). The desktop table has a sticky metric
  column. On phones there is one block per metric with every player listed, so there is no
  sideways scrolling. When the comparison returns 404, each selected player is looked up through
  the existing player endpoint; unknown ones are marked "not found" on their chip, and a "Remove
  the unknown player" action fixes the link.
- **Iteration 1 findings:** P2: on phones, metric rows hid the percentile rank (bar only). The
  rank now shows at every width.
- **Acceptance:**
  - Player header ≤ 260 px; no metric shown twice.
  - On phones all 3 compared players appear under each metric.
  - `?players=bukayo-saka,declan-rice,martin-odegaard` shows the error with the action; pressing it
    leads to `?players=bukayo-saka,declan-rice` and a working comparison (verified URL and render).
  - Tests 38/38; no overflow; no console errors (the 404 on the deliberately broken link is expected).
