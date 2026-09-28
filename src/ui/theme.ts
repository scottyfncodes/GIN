import { useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'the-long-game:theme';
const LIGHT = '#f4efe6';
const DARK = '#12110f';

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemePref>(read);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* per-device convenience only */
    }
    // index.html has one theme-color per system scheme; a forced theme sets both.
    document.getElementById('tc-light')?.setAttribute('content', theme === 'dark' ? DARK : LIGHT);
    document.getElementById('tc-dark')?.setAttribute('content', theme === 'light' ? LIGHT : DARK);
  }, [theme]);
  return [theme, setTheme] as const;
}
