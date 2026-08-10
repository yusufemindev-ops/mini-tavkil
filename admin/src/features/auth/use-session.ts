import { useQuery } from '@tanstack/react-query';
import { fetchCurrentAdmin } from './me-api';

export const SESSION_QUERY_KEY = ['session'] as const;

// The /me call is the source of truth for "am I signed in?" — a 200 means the
// HttpOnly session cookie is valid, a 401 means it isn't. retry:false so an
// unauthenticated 401 redirects immediately instead of retrying.
export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchCurrentAdmin,
    retry: false,
  });
}
