
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from '@/lib/sentry';
import { initMixpanel } from '@/integrations/analytics';

// Initialize error tracking and analytics before rendering
initSentry();
initMixpanel();

// Restore theme preference
const savedTheme = localStorage.getItem('jeeenie_theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
