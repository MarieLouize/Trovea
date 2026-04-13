import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/styles/tokens.css';
import '@/styles/global.css';

// ─── Environment Guard ──────────────────────────────────────────────────────
const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
if (missingEnv && import.meta.env.DEV) {
  console.warn(
    '[Trovéa] Supabase env vars not set. App running on fixture data only.\n' +
    'Copy .env.local.example to .env.local and add your project credentials.'
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);