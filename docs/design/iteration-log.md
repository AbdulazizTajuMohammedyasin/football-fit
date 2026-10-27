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
