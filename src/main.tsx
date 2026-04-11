
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from '@/lib/sentry';
import { initMixpanel } from '@/integrations/analytics';
import { registerSW } from 'virtual:pwa-register';

declare global {
  interface Window {
    __JEENIE_SIM_REACT__?: typeof React;
    __JEENIE_SIM_REACT_DOM__?: {
      createRoot: typeof createRoot;
    };
  }
}

window.__JEENIE_SIM_REACT__ = React;
window.__JEENIE_SIM_REACT_DOM__ = { createRoot };

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

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

// Ensure users pick up the latest dashboard/mobile UI build quickly in production.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    registration?.update();
    setInterval(() => registration?.update(), 60 * 1000);
  },
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {
    // No-op: app can work offline after initial load.
  },
});
