import { createContext } from 'react';

export const ThemeContext = createContext<{ theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void }>({
  theme: 'light',
  setTheme: () => undefined,
});

export const themeStyles = {
  light: {
    app: {
      background: '#f4f6fb',
      color: '#111827',
    },
    sidebar: {
      background: '#ffffff',
      borderRight: '1px solid #d1d5db',
    },
    chatPanel: {
      background: '#eef2ff',
    },
  },
  dark: {
    app: {
      background: '#111827',
      color: '#f9fafb',
    },
    sidebar: {
      background: '#1f2937',
      borderRight: '1px solid #374151',
    },
    chatPanel: {
      background: '#111827',
    },
  },
} as const;
