import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('jeeenie_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('jeeenie_theme', theme);
  }, [theme]);

  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  const setTheme = (t: 'light' | 'dark') => setThemeState(t);

  return { theme, toggleTheme, setTheme };
};
