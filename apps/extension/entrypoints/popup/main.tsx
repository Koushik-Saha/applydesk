import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './globals.css';

// The site toggles dark mode itself (next-themes); the popup has no toggle
// of its own, so it just follows the OS/browser preference (DESIGN.md §10).
const media = window.matchMedia('(prefers-color-scheme: dark)');
const syncTheme = () => document.documentElement.classList.toggle('dark', media.matches);
syncTheme();
media.addEventListener('change', syncTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
