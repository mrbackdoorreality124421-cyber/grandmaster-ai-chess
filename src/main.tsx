import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// 1. One-time legacy unversioned storage key purge
try {
  const legacyKeys = ['gameState', 'chessState', 'chess_state', 'chess_game', 'savedFen', 'fen', 'chess_history'];
  for (const k of legacyKeys) {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  }
} catch (e) {
  console.warn('Legacy storage purge notice:', e);
}

// 2. Register Offline PWA Service Worker
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration notice:', err);
    });
  });
} else if ('serviceWorker' in navigator) {
  // Also register in dev/preview for PWA audit readiness
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
