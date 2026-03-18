export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'cocolomo-theme';

export function getTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function initTheme(): void {
  setTheme(getTheme());
}

export function themeIcon(theme: Theme): string {
  return theme === 'dark' ? '☀️' : '🌙';
}
