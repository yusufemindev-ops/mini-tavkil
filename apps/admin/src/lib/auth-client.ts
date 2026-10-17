import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';
import { env } from '@/lib/env';

// Better Auth client → backend handler at <origin>/api/auth. Cookies are shared
// across localhost ports, so credentials flow to the backend automatically.
// Google-only (no password, no app 2FA), so no twoFactor plugin.
export const authClient = createAuthClient({
  baseURL: env.authUrl,
  plugins: [adminClient()],
});
