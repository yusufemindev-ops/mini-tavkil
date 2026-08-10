// Public (build-time) admin config.
//
// Same-origin everywhere: the admin, the API and Better Auth are one Next.js app
// on one Worker, so there is no cross-origin base URL to configure and no CORS to
// arrange. Tavkil needed VITE_API_URL / VITE_AUTH_URL because its admin, backend
// and storefront were three deployments.
export const env = {
  // Route handlers live at /api/admin/* (PLAN.md §8 kept Tavkil's paths).
  apiBaseUrl: '/api',
  // Better Auth is mounted at /api/auth on this same origin.
  authUrl: '',
};
