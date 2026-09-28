export const APP_NAME = 'The Long Game';

export function renderApp(root, { version, builtAt } = {}) {
  root.innerHTML = `
    <main class="shell">
      <h1 class="title">${APP_NAME}</h1>
      <p class="tagline">Small moves, compounded.</p>
      <p class="meta" data-testid="build-info">v${version ?? 'dev'}${builtAt ? ` · built ${builtAt}` : ''}</p>
    </main>
  `;
  return root;
}
