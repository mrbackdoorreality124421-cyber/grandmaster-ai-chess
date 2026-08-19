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

// 2. Register Offline PWA Service Worker (updateViaCache: 'none' prevents stale shell white-screens)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .catch((err) => {
      console.warn('PWA service worker registration notice:', err);
    });

  // One-time controllerchange listener that safely reloads the page once if updated
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      if (!sessionStorage.getItem('gma_sw_reloaded')) {
        sessionStorage.setItem('gma_sw_reloaded', '1');
        window.location.reload();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
