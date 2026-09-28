# THE LONG GAME (repo: GIN)

Vite + vanilla JS app, deployed to GitHub Pages at https://scottyfncodes.github.io/GIN/

- `npm test` — Vitest (jsdom) unit tests
- `npm run build` — production build into `dist/` (Vite `base` is `/GIN/`)
- `npm run dev` — local dev server

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
