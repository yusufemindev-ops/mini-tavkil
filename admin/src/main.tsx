import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

// Tavkil started an MSW worker here when VITE_API_MOCKING was set. There is one
// environment in this project and one database (CLAUDE.md §7), so there is
// nothing to mock — the admin always talks to the real API on its own origin.
//
// The router is given the /admin basename because the SPA is served under that
// path by the Worker, not at the root.
createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
