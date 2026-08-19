import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// 1. EMERGENCY FIX: CLEAR CORRUPTED CACHE & FEN STORAGE
try {
  const keys = ['gameState', 'chess_state', 'chess_game', 'savedFen', 'fen', 'chess_history'];
  for (const k of keys) {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  }
} catch (e) {
  console.warn('Storage purge notice:', e);
}

// Unregister any old lingering service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
