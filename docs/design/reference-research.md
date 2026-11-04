# Reference research (Phase 2, round 2)

Date: 2026-10-28. The user supplied three references, each with a style-reference document
(`DESIGN.md` exports). Those documents describe tokens and components. The observations below come
from loading the live sites, which is how the documents were checked.

## Source access

| Reference | URL | Inspected how | Limits |
|---|---|---|---|
| Integrated Biosciences | https://integratedbiosciences.com | Headless Chrome at 1440×1000 and 390×844: 7 desktop and 6 phone viewport captures while scrolling, plus a nav hover | The hero is a WebGL/video canvas; one run logged "WebGL context could not be created", so hero imagery may differ from a normal browser. The phone menu was not opened. |
| Ramp | https://ramp.com | 1440×1000: first screen, two scrolled sections, a nav hover. 390×844: first screen and the opened phone menu | Product-UI panels are marketing renders of the app, not the logged-in app. Dropdown menus did not open on hover in headless mode. |
| Dala | https://dala.craftedbygc.com | 1440×1000: 9 captures through a custom scroller (wheel events). 390×844: 6 captures | The first ~3 seconds are a loading screen. The particle visual is WebGL and renders at reduced fidelity headless. |

Screenshots are stored outside the repository because they are third-party material.

**Not inspected:** refero.design, saasui.design, mobbin.com and dribbble.com. The user supplied
specific references instead, so no gallery research was done, and none is claimed.

## What each reference does (observed)

### Integrated Biosciences: primary reference
- **Type:** one regular weight for everything, from about 16 px body copy to an 80–110 px hero
  (`integrated-v0`). Hierarchy comes from size and tight tracking only. Small uppercase mono labels
  carry the metadata: nav items, "PUBLICATIONS", dates, "READ ARTICLE".
- **Colour:** a dark green-ink (`#222f30`) and a warm bone canvas (`#f7f7f5`) alternate as full-width
  bands. The lime accent (`#cef79e`) fills only small things: the 40 px square arrow button beside
  each action, tag dots, and one tile in the three-up "Aging datasets / Drug design / AI" row (`integrated-v2`).
- **Components:** an action is a dark mono-label button paired with a lime arrow square
  ("DISCOVER OUR COMPANY" + →). The nav is a bordered pill group with the active item filled in ink.
  Cards are flat white with 16–20 px radius and no shadow. Numbered tiles (01., 02., 03.) label a
  real three-part platform.
- **Phone:** the same system, compressed rather than redesigned: a floating rounded nav bar with
  a square menu button, stacked tiles, and the arrow-button pairs kept intact (`sheet-integrated-phone`).
- **Weak points:** the hero spends a whole screen on imagery. Body copy in the news cards is about
  13 px grey on white, which is small.

### Ramp: secondary reference, for product density
- **Type and colour:** a single-weight grotesque, near-monochrome warm neutrals, one chartreuse
  (`#e4f222`) used only on primary actions ("See a demo", "Get started for free") (`ramp-desktop-first`).
- **Hero:** left-aligned 64 px headline, a one-line subhead, and a composite control (email input
  flush with the action button) that is the page's job.
- **Product UI:** the app panels are dense, hairline-bordered tables: merchant, category and status
  columns, with about 30 px rows (`ramp-v2`). There is no decoration inside the data.
- **Band:** a full-width strip of live metrics under the hero ("Agents at work today: receipts
  processed 2,301,027 …"). Real figures are presented as instrumentation.
- **Phone menu:** a full-screen sheet of 64 px rows with chevrons, with the account actions pinned to
  the bottom as large buttons (`ramp-phone-menu`).
- **Weak points:** a 40 px announcement bar plus a 62 px nav costs 100 px before content. The
  marketing page is very long (14,000 px).

### Dala: inspiration only, not a structural reference
- A pure-black page with one violet accent and an amber highlight. Headlines are regular weight at
  78–113 px with very tight tracking. Body copy is ultra-light (weight 200). The page is carried by an
  animated WebGL particle "brain" (`sheet-dala`).
- **Phone:** a large left-aligned headline, a short amber caption, one violet pill CTA, and generous
  stacked text (`sheet-dala-phone`).
- **Weak points for us:** a loading screen before content, one idea per viewport, ultra-light body
  copy (poor at small sizes on dark), and imagery that carries no data. A cookie bar covers content
  on every phone screen.

## What the three agree on

1. A **single regular-weight sans** with tight tracking at display sizes. Hierarchy comes from size,
   not weight.
2. **Monochrome plus one signal colour**, used only for actions and active states.
3. **Flat surfaces**: hairline borders, no shadows, tone changes between bands.
4. **Left-aligned** composition inside a 1200–1280 px column.

## Relevance to Football Fit

| Pattern | Source | Use for Football Fit | Adapt, don't copy |
|---|---|---|---|
| Green-ink and bone bands, lime signal | Integrated | Our palette is already pitch green and floodlight yellow; move it to this calmer ink/bone/lime system | Our own token names and values, tuned for contrast on data |
| One regular weight, tight display tracking | All three | Replace the bold condensed Barlow, which flattened our hierarchy (inventory finding 3) | Allow 500 weight for names in dense tables (see the plan) |
| Mono metadata labels | Integrated | Source, season, as-of dates, position codes, column headers, tags | Sentence case except very short tags; never for numbers people compare |
| Dark button + lime arrow square | Integrated | The one forward action per context: "Open shortlist", "Find a finisher" | Not on every link |
| Composite input + action | Ramp | The home club search | It must do something real: filter clubs and open the first match |
| Dense hairline tables | Ramp | Shortlist ranking, squad, compare | Our columns, real data only |
| Real-figure instrumentation strip | Ramp | Data provenance under the home hero: source, season, as-of date, club and player counts | Only figures the API returns; no "live" animation |
| Full-screen phone menu sheet | Ramp | Our phone navigation | Our four destinations plus account actions |
| Headline + body two-column composition | Dala | Home and methodology intros | No particle field, no ultra-light body, no black void |

**Rejected:** Dala's particle hero, loading screen, violet accent and weight-200 body; Integrated's
full-screen hero imagery; Ramp's announcement bar, logo walls and testimonials; animated counters.
None of these helps a fan read squad data, and several cost legibility or speed.

## Chosen direction

**Integrated Biosciences' system, applied with Ramp's product density.** The colour logic
(green-ink, bone, rationed lime) suits a pitch-and-floodlight subject. The typographic restraint fixes
our current hierarchy problem, and Ramp's tables answer our biggest usability problem: shortlist density.
