# Football Fit redesign — design audit and plan
n> **Superseded (2026-10-28):** the visual direction below is replaced by [redesign-plan.md](redesign-plan.md). The data-integrity constraints still apply.

Date: 2026-10-27. Scope: front end only (`frontend/src`). The back end, API contracts,
authentication, scoring and data provenance stay unchanged.

## How the references were inspected

All four sites were opened in headless Chrome (desktop 1440 px and an emulated
390 px phone), using a small DevTools script. Full-page screenshots were taken, and one
was scrolled partway down. Hover states, menus and other in-page interactions were **not**
exercised: the script only loads, scrolls and screenshots. Notes below about motion and
hover are inferred from the static captures and are marked as such.

The screenshots are third-party material, so they are kept out of the repository.
To reproduce them, load each URL at the two widths.

## 1. Reference observations

### dylanbrouwer.design (portfolio)
Observed:
- The hero is the typography itself: a heavy, tightly set condensed sans ("SITES THAT /
  MOVE"), about 140 px tall and filling the width. Small monospaced meta text sits in the corners.
- Thin vertical rules divide the page into visible columns. The grid is part of the look.
- A dark-to-grey gradient canvas with a 3D product mock-up.
- On the 390 px capture, scroll effects left text blurred and panels overlapping, so parts of
  the page were hard to read at that moment of the scroll.

Assumed (from the static capture): the page relies on scroll-driven motion.

### monday.com (work-management SaaS)
Observed:
- The product's own board UI is the hero image. Status cells use solid fills with words in them
  ("Done", "Pending", "Declined"), so colour always comes with a label.
- Pill-shaped segmented filters (Marketing / Operations / IT …) switch the example content.
- Generous white space, a geometric sans in one or two weights, one strong violet CTA colour.
- On mobile the hero collapses to a single centred column with full-width buttons.

### frame.io (media review)
Observed:
- A dark, near-navy canvas. Each section opens with a large, tightly tracked two-line headline,
  with the UI framed beside or below it.
- Feature rows of four short columns, each with a small line icon, a bold title and two
  lines of muted copy.
- Numbers are used as headlines ("2.9x faster").
- On mobile, columns stack and headlines stay large and left aligned.

### agentql.com (developer tool)
Observed:
- The site shows the mechanism: a query panel on the left produces a structured JSON
  result on the right. Input → output is visible rather than described.
- A bento grid of capability tiles, code-panel styling and glowing 3D icons on a near-black page.
- A cookie banner covered content in the capture.

## 2. Principles worth adopting

| Principle | Source | How it applies to Football Fit |
| --- | --- | --- |
| Type as identity | Dylan Brouwer, Frame.io | A condensed athletic face for headings and every score, like scoreboard and kit numbering. |
| The grid as visible structure | Dylan Brouwer | Pitch-line rules and position zones organise the club page instead of decorative cards. |
| Status = colour + word | monday.com | Need levels and data coverage are always written out as well as coloured (never colour alone). |
| Segmented controls for quick switching | monday.com | Squad needs / squad tabs and the position filter in the squad table. |
| Show the mechanism | AgentQL | Each fit score shows its weights → components → result, laid out like an equation, not hidden in prose. |
| Dark band for the subject, light page for the evidence | Frame.io | A floodlit pitch-green header for club and player identity; reading surfaces stay light for dense data. |
| Numbers as headlines | Frame.io | Fit, need and role scores are the largest elements in their rows. |

## 3. Elements to avoid

- Scroll-jacking, blur and parallax (Dylan Brouwer): they hurt legibility on phones and slow
  down analysis.
- Gradient canvases, glass panels and glowing 3D icons (Frame.io, AgentQL): decoration
  without information.
- Logo walls, testimonials and sales CTAs (monday.com, Frame.io): Football Fit has nothing
  to sell, and club crests are not licensed for use here.
- An all-dark interface (Frame.io, AgentQL): long tables of per-90 figures read better on a light surface.
- Illustrated characters (monday.com): wrong tone for an evidence product.
- Invented hero stats ("2.9x faster"): every number shown must come from the data.

## 4. Visual direction: "floodlit scouting report"

A matchday scouting dossier: a dark pitch-green band for identity, chalk-white working
surfaces, condensed scoreboard numerals, and pitch-line geometry used only where it
explains something (position zones, the need map).

**Colour tokens**

| Token | Value | Use |
| --- | --- | --- |
| Pitch night | `#0D2A20` | Header, hero bands, dark panels |
| Pitch | `#14684A` | Primary action, links, positive fit |
| Chalk | `#F3F5F1` | Page background (cool, not cream) |
| Line | `#D3DCD5` | Rules, borders, table dividers |
| Ink | `#14211C` | Body text (≥ 12:1 on chalk) |
| Floodlight | `#E9F27A` | One highlight on dark surfaces only: active nav, the focus of a hero |
| Card red / card yellow / grass | `#B42318` / `#B45309` / `#15803D` | High / medium / low need (always with a text label) |
| Comparison series | pitch, `#2F54C9`, `#C2410C`, `#7C3AED` | Up to four players in Compare |

**Type**: Barlow Condensed (600–700) for display headings, scores and position codes;
Barlow (400–600) for body and UI text. One family in two widths keeps the system coherent.
Figures are tabular wherever numbers line up. Sentence case throughout; no tracked-out
all-caps eyebrows.

**Shape and motion**: 6 px radius on controls, 10 px on panels, square-cornered position chips.
Borders, not shadows, separate surfaces. Motion is limited to responses to user actions
(expanding evidence, the compare tray appearing) and respects `prefers-reduced-motion`.

**The one bold element**: the need map, a top-down pitch with the four position zones
filled by need level, which opens the club page. Everything around it stays quiet.

## 5. Page-by-page plan

| Route | Today | Redesign |
| --- | --- | --- |
| Shell (`Layout`) | Green bar, wrapping nav, centred footer line | Pitch-night header with a condensed wordmark, active-route marker, a mobile menu button with a disclosure panel, the data notice as a slim strip, and a footer that repeats the fit-score caveat and links to the method. |
| `/` Clubs | Heading, three step cards, grid of club links | A two-column hero that states the job and shows the journey as a real sequence. Clubs appear as a scoreboard grid: short code in large condensed type, full name, squad size and a source label, grouped by source with real/demo clearly marked. The filter stays. |
| `/clubs/:slug` Needs | Stacked cards with three bars each | A club hero band (code, name, provenance). The need map shows positions on a pitch with level labels and links to each position's detail. Each position row has the score, level, components with weights, evidence and role links. |
| `/clubs/:slug?tab=squad` | Flat table | A position segmented filter (client-side, on the data already loaded) and a table grouped by position with condensed position chips, minutes and best-role score bars. The table scrolls horizontally inside its own container on phones. |
| `/clubs/:slug/shortlist` | Sidebar filters and tall result cards | A sticky filter rail (role, weights, filters) and a ranked board: rank, player, context, a big fit numeral with bar, compare and save. "Why this score?" expands into an equation strip (component × weight) plus metric rows. A sticky compare tray appears once two players are picked. |
| `/players/:slug` | Header, facts strip, role cards, metric list | A dark identity band (name, position chips, club, facts), care warnings, role-score panels led by the score numeral, and a metrics table with percentile bars and an explicit "Not recorded". |
| `/compare` | Picker panel and plain table | Picker and role selector in a toolbar, colour-keyed player header columns (series colours), per-metric percentile bars, the best value marked with a label as well as a tint, and the table scrolling inside its own container. |
| `/methodology` | Long single column | A document layout with a sticky contents rail on desktop, formulas set as weight tables, role profiles as compact weight bars, and the glossary. |
| `/signin`, `/signup` | Small centred form | A split panel: a dark side explaining what an account adds (saved shortlists only), the form on the light side. Behaviour and copy that tests rely on are unchanged. |
| `/shortlists` | Cards with lists | A board of saved lists with player rows, unavailable players shown honestly, and the create form as a toolbar. |
| 404 | Plain text | A pitch-themed not-found panel with a route back. |

## Constraints carried into the build

- No API, scoring, auth, routing or data changes. Filters, sorting and comparison keep
  their current URL parameters and behaviour.
- No new npm dependencies. Fonts load from Google Fonts with system fallbacks.
- Existing test expectations (labels, button names, badge text such as
  `Incomplete data · 60%`) are preserved; tests are not weakened.
- Missing data stays visibly missing ("Not recorded", hatched bars), and demo data stays labelled.

## Implementation order

1. Design tokens, fonts, shared primitives (buttons, badges, score bar, states, page header,
   position chip, section headings) and the app shell.
2. Clubs (home) page.
3. Club needs (need map) and squad table.
4. Shortlist board and compare tray.
5. Player profile.
6. Compare page.
7. Methodology, auth, saved shortlists, 404.
8. Verification pass: screenshots at 1440 / 768 / 390, overflow and console checks, tests,
   type check, lint and build; fix what they find.
