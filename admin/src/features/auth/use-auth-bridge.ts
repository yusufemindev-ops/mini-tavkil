import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { setOnUnauthorized } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';
import { SESSION_QUERY_KEY } from './use-session';
import type { CurrentAdmin } from './me-api';

// Bridges the framework-agnostic API client to React and keeps the cached session
// honest as the admin navigates.
//
// 1. On a 401 from the API, clear the session and go to /login.
// 2. On every navigation (while we believe we're signed in), re-validate the
//    session — so an expired session is caught even on pages that make no API
//    call (e.g. mock-data pages), not only when a real request 401s.
export function useAuthBridge(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    setOnUnauthorized(() => {
      queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY });
      // Clear the now-dead session cookie (the server already revoked the session).
      void authClient.signOut().catch(() => undefined);
      navigate('/login', { replace: true });
    });
    return () => setOnUnauthorized(null);
  }, [queryClient, navigate]);

  useEffect(() => {
    const current = queryClient.getQueryData<CurrentAdmin | null>(SESSION_QUERY_KEY);
    if (current) {
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    }
  }, [pathname, queryClient]);
}
