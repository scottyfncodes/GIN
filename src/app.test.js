import { describe, expect, it } from 'vitest';
import { APP_NAME, renderApp } from './app.js';

describe('renderApp', () => {
  it('renders the app name as the heading', () => {
    const root = renderApp(document.createElement('div'));
    expect(root.querySelector('h1').textContent).toBe(APP_NAME);
    expect(APP_NAME).toBe('The Long Game');
  });

  it('shows version and build time', () => {
    const root = renderApp(document.createElement('div'), { version: '1.2.3', builtAt: 'now' });
    expect(root.querySelector('[data-testid="build-info"]').textContent).toBe('v1.2.3 · built now');
  });

  it('falls back to dev when no version is given', () => {
    const root = renderApp(document.createElement('div'));
    expect(root.querySelector('[data-testid="build-info"]').textContent).toBe('vdev');
  });
});
