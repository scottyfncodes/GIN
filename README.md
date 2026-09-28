# The Long Game

Scott vs Ellen. A game with no end.

A private, local-first scorekeeper and statistical record for a never-ending
game of gin rummy. Install it on an iPhone from Safari → Share → Add to Home Screen.

Live: https://scottyfncodes.github.io/GIN/

```sh
npm install
npm run dev     # local dev server
npm test        # tests
npm run build   # typecheck + production build to dist/
```

Pushes to `main` deploy to GitHub Pages through `.github/workflows/deploy.yml`.
See `CLAUDE.md` for the scoring rule, architecture, and required update workflow.
