// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

async function mount() {
  vi.resetModules();
  const { App } = await import('./App');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<App />));
}

const byText = (text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined;

async function click(el: Element | undefined) {
  expect(el).toBeTruthy();
  await act(async () => (el as HTMLElement).click());
}

async function recordHand(scott: string, ellen: string) {
  await click(byText('RECORD HAND') ?? byText('RECORD FIRST HAND'));
  for (const d of scott) await click(byText(d));
  if (container.querySelector('.entry-field.who-scott.active')) await click(byText('Ellen ↓'));
  for (const d of ellen) await click(byText(d));
  await click(byText('SAVE HAND'));
}

beforeEach(async () => {
  localStorage.clear();
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  window.scrollTo = () => {};
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('App', () => {
  it('shows the polished empty state with no fake data', async () => {
    await mount();
    expect(container.textContent).toContain('A game with no end.');
    expect(container.textContent).toContain('0 HANDS');
    expect(byText('RECORD FIRST HAND')).toBeTruthy();
  });

  it('records a hand, previews the award, and persists across reloads', async () => {
    await mount();
    await click(byText('RECORD FIRST HAND'));
    expect(container.textContent).toContain('HAND 1');
    expect(byText('SAVE HAND')!.disabled).toBe(true);
    await click(byText('1'));
    await click(byText('3'));
    await click(byText('Ellen ↓'));
    await click(byText('0'));
    expect(container.querySelector('.entry-award')!.textContent).toBe('ELLEN +13');
    await click(byText('SAVE HAND'));

    const nums = [...container.querySelectorAll('.score-num')].map((n) => n.textContent);
    expect(nums).toEqual(['0', '13']);
    expect(container.querySelector('.lead-banner')!.textContent).toBe('ELLEN LEADS BY 13');
    expect(container.textContent).toContain('1 HAND');

    act(() => root.unmount());
    container.remove();
    await mount();
    expect(container.querySelector('.lead-banner')!.textContent).toBe('ELLEN LEADS BY 13');
  });

  it('shows no points for equal leftovers and supports undo', async () => {
    await mount();
    await recordHand('4', '9');
    expect(container.querySelector('.lead-banner')!.textContent).toBe('SCOTT LEADS BY 5');
    await recordHand('7', '7');
    expect(container.textContent).toContain('2 HANDS');
    await click(byText('UNDO'));
    expect(container.textContent).toContain('1 HAND');
  });

  it('auto-advances to Ellen after Scott enters 0', async () => {
    await mount();
    await click(byText('RECORD FIRST HAND'));
    await click(byText('0'));
    expect(container.querySelector('.entry-field.who-ellen.active')).toBeTruthy();
    await click(byText('8'));
    expect(container.querySelector('.entry-award')!.textContent).toBe('SCOTT +8');
  });

  it('renders every screen with data', async () => {
    await mount();
    await recordHand('0', '20');
    await recordHand('30', '0');
    await recordHand('5', '5');
    for (const tab of ['Rivalry', 'Players', 'Records', 'Hands']) {
      await click([...container.querySelectorAll('.tabbar button')].find((b) => b.textContent === tab));
      expect(container.querySelector('.screen-title')).toBeTruthy();
    }
    expect(container.textContent).toContain('HAND 3');
  });
});
