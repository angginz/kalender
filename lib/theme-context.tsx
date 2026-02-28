
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get initial theme before React hydration
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  // Check localStorage first
  const savedTheme = localStorage.getItem('theme') as Theme;
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    return savedTheme;
  }
  
  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const [hasManualPreference, setHasManualPreference] = useState(false);

  // Initialize theme immediately on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const manualFlag = localStorage.getItem('theme_manual');
    const hasSavedTheme = savedTheme === 'light' || savedTheme === 'dark';
    const isManual = manualFlag === '1' && hasSavedTheme;

    // Migration: jika ada localStorage theme lama tapi belum pernah set manual,
    // anggap itu bukan preferensi manual dan ikuti sistem.
    if (!isManual && hasSavedTheme) {
      localStorage.removeItem('theme');
    }

    setHasManualPreference(isManual);

    const initialTheme = isManual ? savedTheme : getInitialTheme();
    setTheme(initialTheme);
    
    // Apply theme class immediately to prevent flash
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(initialTheme);
    root.style.colorScheme = initialTheme;
    
    setMounted(true);
  }, []);

  // Sync theme changes to DOM and localStorage
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    if (hasManualPreference) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted, hasManualPreference]);

  // Listen to system theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!hasManualPreference) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, hasManualPreference]);

  const toggleTheme = useCallback(() => {
    setHasManualPreference(true);
    localStorage.setItem('theme_manual', '1');
    setTheme(prevTheme => {
      const next = prevTheme === 'light' ? 'dark' : 'light';

      // Apply immediately for instant UI feedback
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(next);
      root.style.colorScheme = next;
      localStorage.setItem('theme', next);

      return next;
    });
  }, []);

  // Always provide context value, even during mounting
  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
    mounted
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {!mounted ? (
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
