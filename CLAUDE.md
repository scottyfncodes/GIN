# THE LONG GAME (repo: GIN)

A local-first PWA scorekeeper for Scott and Ellen's never-ending gin rummy game.
React + TypeScript + Vite, deployed to GitHub Pages at https://scottyfncodes.github.io/GIN/

- `npm test` — Vitest (engine, storage, and jsdom UI tests)
- `npm run build` — typecheck + production build into `dist/` (Vite `base` is `/GIN/`)
- `npm run dev` — local dev server

## Scoring rule (house rule, not standard gin)

Each hand records both players' leftover (deadwood) totals. The player with
**less** leftover receives the difference; the other gets 0; equal leftovers
score nothing (Scott 13 / Ellen 0 → Ellen +13). No bonuses of any kind. This
lives only in `scoreHand` in `src/engine/scoring.ts`.

## Layout

- `src/engine/` — pure, framework-free logic. `stats.ts` derives everything
  (totals, leader, stretches, comebacks, streaks, records) in O(n) passes from
  the raw hand list; `moments.ts` builds the timeline. Never store derived
  values: recompute from hands.
- `src/storage/` — `schema.ts` (versioned format, `migrate`, import validation)
  and `store.ts` (localStorage persistence). Bump `SCHEMA_VERSION` and add a
  migration step for any stored-shape change.
- `src/ui/` — React screens and SVG charts. `public/sw.js` is the offline
  service worker; `public/icons/` holds the app icon (source: `icon.svg`).

## Non-negotiable update workflow

Every update, however small, follows all of these steps:

1. Make the requested changes.
2. Run the full test suite (`npm test`).
3. Run the production build (`npm run build`).
4. Fix any errors or failing tests.
5. Commit the changes.
6. Open a pull request for the update.
7. Merge the pull request into `main`.
8. Wait for the "Deploy to GitHub Pages" workflow to finish.
9. Verify the deployed app works.
10. Put the live URL, https://scottyfncodes.github.io/GIN/, in the final response.

Never stop at an unmerged PR, and never give only the repository link. If the
Pages deployment fails, troubleshoot and fix it before calling the update done.

The footer on the page shows the version and build time, so you can check that
the live site is the build you just merged.
